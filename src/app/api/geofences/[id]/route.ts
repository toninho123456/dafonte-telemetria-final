import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, tenantScope } from "@/lib/permissions";
import { fail, HttpError } from "@/lib/http";
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const u = await requireUser("geofence:write");
    const g = await prisma.geofence.findFirst({ where: { id: params.id, ...tenantScope(u) } });
    if (!g) throw new HttpError(404, "Área não encontrada");
    await prisma.geofence.delete({ where: { id: g.id } });
    await audit(u, `excluiu a área ${g.name}`);
    return Response.json({ ok: true });
  } catch (e) { return fail(e) }
}
