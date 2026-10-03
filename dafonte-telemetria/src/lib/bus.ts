import { EventEmitter } from "node:events";
// Barramento em memória: a rota /api/telemetry publica e o servidor WebSocket (server.ts) assina.
// Funciona com UM processo. Com várias instâncias, troque por Redis pub/sub.
const g = globalThis as unknown as { __dafonteBus?: EventEmitter };
export const bus = (g.__dafonteBus ??= new EventEmitter().setMaxListeners(0));
export type AlertEvt = { tenantId: string; id: string; tractorId: string; kind: string; message: string; createdAt: string };
export type LivePoint = {
  tenantId: string; tractorId: string; lat: number; lng: number; speed: number;
  heading: number | null; engineOn: boolean; recordedAt: string; receivedAt: string;
};
