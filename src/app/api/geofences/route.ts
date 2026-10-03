import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/permissions";
import { fail, HttpError } from "@/lib/http";
const Body = z.object({ name: z.string().trim().min(2).max(60), points: z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).min(3).max(100) });
export async function POST(req: Request) {
  try {
    const u = await requireUser("geofence:write");
    if (!u.tenantId) throw new HttpError(400, "Use uma conta de concessionária");
    const raw = await req.text();
    if (raw.length > 20_000) throw new HttpError(413, "Área grande demais");
    const p = Body.safeParse(JSON.parse(raw));
    if (!p.success) throw new HttpError(400, "Dados inválidos");
    if ((await prisma.geofence.count({ where: { tenantId: u.tenantId } })) >= 100) throw new HttpError(400, "Limite de 100 áreas");
    const g = await prisma.geofence.create({ data: { tenantId: u.tenantId, name: p.data.name, points: p.data.points } });
    await audit(u, `criou a área ${g.name}`);
    return Response.json({ id: g.id });
  } catch (e) { return e instanceof SyntaxError ? fail(new HttpError(400, "JSON inválido")) : fail(e) }
}
