import { headers } from "next/headers";
import { prisma } from "@/lib/db";
// O IP vem de x-forwarded-for: só é confiável atrás de um proxy/CDN que você controla.
export async function audit(u: { id?: string; tenantId?: string | null } | null, action: string, o?: { tractorId?: string }) {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await prisma.auditLog.create({ data: { tenantId: u?.tenantId ?? null, userId: u?.id ?? null, action, tractorId: o?.tractorId, ip } });
}
