import type { Role } from "@prisma/client";
// Sem dependências do Next: também é usado pelo servidor WebSocket (server.ts).
export const PERMS: Record<string, Role[]> = {
  "tractor:write": ["ADMIN"], "device:write": ["ADMIN"], "user:manage": ["ADMIN"], "geofence:write": ["ADMIN"], "alerts:configure": ["ADMIN"], "audit:view": ["ADMIN"], "tenant:write": ["ADMIN"],
  "alerts:view": ["ADMIN", "GESTOR"], "telemetry:view": ["ADMIN", "GESTOR", "ANALISTA"], "history:view": ["ADMIN", "GESTOR", "ANALISTA"], "map:view": ["ADMIN", "GESTOR", "OPERADOR"],
};
