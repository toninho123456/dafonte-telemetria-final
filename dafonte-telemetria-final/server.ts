// Servidor próprio: Next.js + WebSocket (/ws) no mesmo processo e na mesma porta.
import { createServer } from "node:http";
import next from "next";
import { loadEnvConfig } from "@next/env";
import { WebSocketServer, WebSocket } from "ws";
import type { Role } from "@prisma/client";

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev); // carrega o .env antes de importar o banco

type U = { id: string; role: Role; tenantId: string | null };
type Client = { ws: WebSocket; user: U; allowed: Set<string>; alive: boolean };

async function main() {
  const { prisma } = await import("./src/lib/db");
  const { bus } = await import("./src/lib/bus");
  type LivePoint = import("./src/lib/bus").LivePoint;
  const { verifyTicket } = await import("./src/lib/wsTicket");
  const { visibleWhere } = await import("./src/lib/scope");
  const { PERMS } = await import("./src/lib/perms");

  const port = Number(process.env.PORT ?? 3000);
  const origin = new URL(process.env.APP_URL ?? `http://localhost:${port}`).origin;
  const ALERT_ROLES = new Set<string>(["PLATFORM_ADMIN", ...PERMS["alerts:view"]]);
  const MAP_ROLES = new Set<string>(["PLATFORM_ADMIN", ...PERMS["map:view"]]);

  const app = next({ dev });
  const handle = app.getRequestHandler();
  const upgradeNext = app.getUpgradeHandler(); // HMR do Next em desenvolvimento
  await app.prepare();

  // Relê o usuário no banco: bloqueio, troca de cargo e concessionária inativa valem na hora.
  async function loadUser(id: string): Promise<U | null> {
    const u = await prisma.user.findUnique({ where: { id }, include: { tenant: true } });
    if (!u || u.status !== "ACTIVE" || !MAP_ROLES.has(u.role) || (u.tenantId && !u.tenant?.active)) return null;
    return { id: u.id, role: u.role, tenantId: u.tenantId };
  }
  const allowedIds = async (u: U) => new Set((await prisma.tractor.findMany({ where: visibleWhere(u), select: { id: true } })).map((t) => t.id));

  const clients = new Set<Client>();
  const perUser = new Map<string, number>();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });

  const server = createServer((req, res) => handle(req, res));
  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname !== "/ws") { upgradeNext(req, socket, head); return }
    const reject = (code: number, msg: string) => { socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\n\r\n`); socket.destroy() };
    try {
      if (req.headers.origin !== origin) return reject(403, "Forbidden"); // evita sequestro de WebSocket por outro site
      const uid = verifyTicket(url.searchParams.get("t") ?? "");
      const user = uid ? await loadUser(uid) : null;
      if (!user) return reject(401, "Unauthorized");
      if ((perUser.get(user.id) ?? 0) >= 5) return reject(429, "Too Many Requests");
      const allowed = await allowedIds(user);
      wss.handleUpgrade(req, socket, head, (ws) => {
        const c: Client = { ws, user, allowed, alive: true };
        clients.add(c); perUser.set(user.id, (perUser.get(user.id) ?? 0) + 1);
        ws.on("pong", () => { c.alive = true });
        ws.on("message", () => {}); // o cliente não envia nada; ignorar
        ws.on("error", () => ws.terminate());
        ws.on("close", () => {
          clients.delete(c);
          const n = (perUser.get(user.id) ?? 1) - 1;
          if (n <= 0) perUser.delete(user.id); else perUser.set(user.id, n);
        });
      });
    } catch (e) { console.error(e); reject(500, "Error") }
  });

  // Envia cada ponto só para quem pode ver aquele trator (mesma regra das telas).
  bus.on("point", (p: LivePoint) => {
    const { tenantId, ...msg } = p;
    const data = JSON.stringify({ type: "point", ...msg });
    for (const c of clients) {
      if (c.ws.readyState !== WebSocket.OPEN) continue;
      if (c.user.role !== "PLATFORM_ADMIN" && c.user.tenantId !== tenantId) continue;
      if (!c.allowed.has(p.tractorId)) continue;
      if (c.ws.bufferedAmount > 1_000_000) { c.ws.terminate(); continue } // cliente lento demais
      c.ws.send(data);
    }
  });

  bus.on("alert", (a: import("./src/lib/bus").AlertEvt) => {
    const data = JSON.stringify({ type: "alert", id: a.id, tractorId: a.tractorId, kind: a.kind, message: a.message, createdAt: a.createdAt });
    for (const c of clients) {
      if (c.ws.readyState !== WebSocket.OPEN || !ALERT_ROLES.has(c.user.role)) continue;
      if (c.user.role !== "PLATFORM_ADMIN" && c.user.tenantId !== a.tenantId) continue;
      if (c.allowed.has(a.tractorId)) c.ws.send(data);
    }
  });

  // Retenção: apaga pontos de histórico com mais de 90 dias (1x por dia).
  const purge = () => prisma.telemetry.deleteMany({ where: { recordedAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } }).catch((e) => console.error(e));
  purge(); setInterval(purge, 86_400_000);

  // A cada 15 s: revalida cada conexão e avisa se alguma permissão foi retirada.
  setInterval(async () => {
    for (const c of [...clients]) {
      try {
        const user = await loadUser(c.user.id);
        if (!user) { c.ws.close(4001, "sessao invalida"); continue }
        const allowed = await allowedIds(user);
        const revoked = [...c.allowed].filter((id) => !allowed.has(id));
        c.user = user; c.allowed = allowed;
        if (revoked.length && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify({ type: "revoked", tractorIds: revoked }));
      } catch (e) { console.error(e) }
    }
  }, 15_000);
  // A cada 30 s: derruba conexões mortas.
  setInterval(() => {
    for (const c of clients) { if (!c.alive) { c.ws.terminate(); continue } c.alive = false; c.ws.ping() }
  }, 30_000);

  server.listen(port, () => console.log(`> Dafonte pronto em ${origin} (${dev ? "desenvolvimento" : "produção"}) · WebSocket em /ws`));
}
main().catch((e) => { console.error(e); process.exit(1) });
