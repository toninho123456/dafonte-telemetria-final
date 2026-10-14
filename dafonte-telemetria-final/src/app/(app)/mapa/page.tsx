import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { visibleWhere, tenantScope } from "@/lib/scope";
import type { LL } from "@/lib/geo";
import LiveMap from "./LiveMap";

export default async function Page() {
  const u = (await auth())!.user;
  if (u.role !== "PLATFORM_ADMIN" && !PERMS["map:view"].includes(u.role)) notFound();
  const ts = await prisma.tractor.findMany({ where: visibleWhere(u), include: { status: true }, orderBy: { name: "asc" } });
  const fences = (await prisma.geofence.findMany({ where: { ...tenantScope(u), active: true } })).map((g) => ({ id: g.id, name: g.name, points: g.points as unknown as LL[] }));
  const initial = ts.map((t) => ({
    id: t.id, name: t.name, brand: t.brand, model: t.model,
    p: t.status && { lat: t.status.lat, lng: t.status.lng, speed: t.status.speed, heading: t.status.heading, engineOn: t.status.engineOn, recordedAt: t.status.recordedAt.toISOString(), receivedAt: t.status.receivedAt.toISOString() },
  }));
  return (<div className="grid gap-3"><h1 className="text-xl font-bold">Mapa da frota</h1><LiveMap initial={initial} fences={fences} /></div>);
}
