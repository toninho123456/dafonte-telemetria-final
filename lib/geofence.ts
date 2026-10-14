import { prisma } from "@/lib/db";
import { bus } from "@/lib/bus";
import { pointInPolygon, type LL } from "@/lib/geo";
type F = { id: string; name: string; pts: LL[] };
const cache = new Map<string, { at: number; list: F[] }>(); // 10 s: mudanças em áreas valem em até 10 s
async function fences(tenantId: string) {
  const c = cache.get(tenantId);
  if (c && Date.now() - c.at < 10_000) return c.list;
  const rows = await prisma.geofence.findMany({ where: { tenantId, active: true } });
  const list = rows.map((r) => ({ id: r.id, name: r.name, pts: r.points as unknown as LL[] }));
  cache.set(tenantId, { at: Date.now(), list });
  return list;
}
// Compara com o último estado conhecido; só gera alerta quando muda (a primeira leitura só registra).
export async function evalFences(tenantId: string, tractorId: string, lat: number, lng: number) {
  const list = await fences(tenantId);
  if (!list.length) return;
  const states = await prisma.geofenceState.findMany({ where: { tractorId, geofenceId: { in: list.map((f) => f.id) } } });
  const byId = new Map(states.map((s) => [s.geofenceId, s]));
  let name: string | null = null;
  for (const f of list) {
    const inside = pointInPolygon(lat, lng, f.pts), s = byId.get(f.id);
    if (!s) { await prisma.geofenceState.create({ data: { geofenceId: f.id, tractorId, inside } }); continue }
    if (s.inside === inside) continue;
    await prisma.geofenceState.update({ where: { geofenceId_tractorId: { geofenceId: f.id, tractorId } }, data: { inside } });
    name ??= (await prisma.tractor.findUnique({ where: { id: tractorId }, select: { name: true } }))?.name ?? "Trator";
    const a = await prisma.alert.create({ data: { tenantId, tractorId, geofenceId: f.id, kind: inside ? "ENTER" : "EXIT", message: `${name} ${inside ? "entrou em" : "saiu de"} ${f.name}` } });
    bus.emit("alert", { tenantId, id: a.id, tractorId, kind: a.kind, message: a.message, createdAt: a.createdAt.toISOString() });
  }
}
