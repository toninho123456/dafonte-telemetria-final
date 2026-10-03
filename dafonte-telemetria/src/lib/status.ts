export type Status = "moving" | "idle" | "off" | "offline" | "none";
export const OFFLINE_MS = 5 * 60_000; // sem dados há mais de 5 min = sem sinal
export const MOVING_KMH = 2;
type S = { speed: number; engineOn: boolean; receivedAt: string | Date };
export function statusOf(p: S | null, now = Date.now()): Status {
  if (!p) return "none";
  if (now - new Date(p.receivedAt).getTime() > OFFLINE_MS) return "offline";
  if (!p.engineOn) return "off";
  return p.speed >= MOVING_KMH ? "moving" : "idle";
}
export const STATUS_LABEL: Record<Status, string> = { moving: "Em movimento", idle: "Ligado e parado", off: "Desligado", offline: "Sem sinal", none: "Aguardando dados" };
export const STATUS_COLOR: Record<Status, string> = { moving: "#22c55e", idle: "#f2b01e", off: "#71717a", offline: "#ef4444", none: "#3f3f46" };
