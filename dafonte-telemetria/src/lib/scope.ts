import type { Prisma, Role } from "@prisma/client";
// Funções puras (sem Next/auth): usadas pelas telas e pelo servidor WebSocket.
type U = { id: string; role: Role; tenantId: string | null };
export const tenantScope = (u: { role: Role; tenantId: string | null }) => u.role === "PLATFORM_ADMIN" ? {} : { tenantId: u.tenantId! };
// Administrador vê todos os tratores da concessionária; os demais, só os autorizados.
export const visibleWhere = (u: U): Prisma.TractorWhereInput =>
  u.role === "ADMIN" || u.role === "PLATFORM_ADMIN" ? tenantScope(u) : { ...tenantScope(u), access: { some: { userId: u.id } } };
