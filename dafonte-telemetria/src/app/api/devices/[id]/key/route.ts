import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, tenantScope } from "@/lib/permissions";
import { newKey, hashKey } from "@/lib/deviceKey";
import { fail, HttpError } from "@/lib/http";
export const dynamic = "force-dynamic";
// Gera (ou troca) a chave do dispositivo. A chave é devolvida UMA vez; no banco fica só o hash.
export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const u = await requireUser("device:write");
    const dev = await prisma.device.findFirst({ where: { id: params.id, ...tenantScope(u) } });
    if (!dev) throw new HttpError(404, "Dispositivo não encontrado");
    const key = newKey();
    await prisma.device.update({ where: { id: dev.id }, data: { keyHash: hashKey(key) } });
    await audit(u, `gerou nova chave do dispositivo ${dev.deviceId}`, { tractorId: dev.tractorId ?? undefined });
    return Response.json({ key }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fail(e) }
}
