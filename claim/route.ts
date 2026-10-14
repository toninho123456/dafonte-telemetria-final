import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/permissions";
import { hashClaim } from "@/lib/claim";
import { tooMany } from "@/lib/ratelimit";
import { fail, HttpError } from "@/lib/http";
export const dynamic = "force-dynamic";

// O cliente digita o código que a loja entregou: o trator (com o rastreador e o histórico) passa para a conta dele.
export async function POST(req: Request) {
  try {
    const u = await requireUser();
    if (!u.tenantId) throw new HttpError(403, "Use uma conta de cliente");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
    if (tooMany(`claim:${u.id}`, 5, 15 * 60_000) || tooMany(`claim-ip:${ip}`, 30, 15 * 60_000)) throw new HttpError(429, "Muitas tentativas. Espere 15 minutos e tente de novo.");
    const p = z.object({ code: z.string().trim().min(8).max(20) }).safeParse(await req.json().catch(() => null));
    if (!p.success) throw new HttpError(400, "Digite o código de ativação.");
    const tenant = await prisma.tenant.findUnique({ where: { id: u.tenantId }, select: { selfService: true } });
    if (!tenant?.selfService) throw new HttpError(403, "A ativação é feita pela conta do cliente.");

    const h = hashClaim(p.data.code), tenantId = u.tenantId;
    const t = await prisma.tractor.findUnique({ where: { claimHash: h } });
    if (!t || !t.claimExpiresAt || t.claimExpiresAt < new Date()) throw new HttpError(404, "Código inválido ou expirado. Confira com a Dafonte.");
    await prisma.$transaction(async (tx) => {
      // updateMany com o hash na condição: se duas pessoas usarem o mesmo código ao mesmo tempo, só uma passa.
      const r = await tx.tractor.updateMany({ where: { id: t.id, claimHash: h, claimExpiresAt: { gt: new Date() } }, data: { tenantId, claimHash: null, claimExpiresAt: null } });
      if (r.count !== 1) throw new HttpError(404, "Código inválido ou expirado. Confira com a Dafonte.");
      await tx.tractorAccess.deleteMany({ where: { tractorId: t.id } }); // permissões da loja não passam para o cliente
      await tx.geofenceState.deleteMany({ where: { tractorId: t.id } }); // áreas e alertas eram da loja
      await tx.alert.deleteMany({ where: { tractorId: t.id } });
      await tx.telemetry.updateMany({ where: { tractorId: t.id }, data: { tenantId } }); // histórico acompanha o trator
      await tx.device.updateMany({ where: { tractorId: t.id }, data: { tenantId } }); // o rastreador continua com a mesma chave
    });
    await audit(u, `ativou o trator ${t.name} com código`, { tractorId: t.id });
    return Response.json({ ok: true, id: t.id });
  } catch (e) { return fail(e) }
}
