import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { tenantScope } from "@/lib/scope";
import type { LL } from "@/lib/geo";
import FenceEditor from "./FenceEditor";
export default async function Page() {
  const u = (await auth())!.user;
  if (u.role !== "PLATFORM_ADMIN" && !PERMS["alerts:view"].includes(u.role)) notFound();
  const rows = await prisma.geofence.findMany({ where: tenantScope(u), orderBy: { name: "asc" } });
  return (<div className="grid gap-3"><h1 className="text-xl font-bold">Áreas (geofences)</h1>
    <FenceEditor canEdit={PERMS["geofence:write"].includes(u.role)} fences={rows.map((r) => ({ id: r.id, name: r.name, points: r.points as unknown as LL[] }))} /></div>);
}
