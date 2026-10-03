import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { visibleWhere } from "@/lib/scope";
export { visibleWhere };
type U = { id: string; role: Role; tenantId: string | null };
// Sem permissão = 404: a pessoa nem descobre que o trator existe.
export async function tractorFor(u: U, id: string) {
  const t = await prisma.tractor.findFirst({ where: { id, ...visibleWhere(u) }, include: { device: true, status: true } });
  if (!t) notFound();
  return t;
}
