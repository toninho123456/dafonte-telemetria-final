import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { HttpError } from "@/lib/http";
import { PERMS } from "@/lib/perms";
export { PERMS };
// Use em TODA rota de API. A checagem é feita no servidor, nunca só na tela.
export async function requireUser(action?: string) {
  const u = (await auth())?.user;
  if (!u?.id) throw new HttpError(401, "Não autenticado");
  if (action && u.role !== "PLATFORM_ADMIN" && !PERMS[action]?.includes(u.role)) throw new HttpError(403, "Sem permissão");
  return u;
}
// Isolamento entre concessionárias: inclua nas consultas de dados de negócio.
export { tenantScope } from "@/lib/scope";
