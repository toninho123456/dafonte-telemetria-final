import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
// Ingresso curto (60 s, uso único) para abrir o WebSocket sem expor o cookie de sessão ao servidor WS.
const secret = () => { const s = process.env.AUTH_SECRET; if (!s) throw new Error("AUTH_SECRET ausente"); return s };
const sig = (b: string) => createHmac("sha256", secret()).update("ws-ticket:" + b).digest("base64url");
export function signTicket(uid: string, ttlMs = 60_000) {
  const body = Buffer.from(JSON.stringify({ uid, exp: Date.now() + ttlMs, n: randomBytes(8).toString("hex") })).toString("base64url");
  return `${body}.${sig(body)}`;
}
const used = new Map<string, number>();
export function verifyTicket(t: string): string | null {
  const [body, mac] = t.split(".");
  if (!body || !mac) return null;
  const a = Buffer.from(mac), b = Buffer.from(sig(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let p: { uid?: unknown; exp?: unknown; n?: unknown };
  try { p = JSON.parse(Buffer.from(body, "base64url").toString()) } catch { return null }
  const now = Date.now();
  for (const [k, e] of used) if (e < now) used.delete(k);
  if (typeof p.uid !== "string" || typeof p.exp !== "number" || typeof p.n !== "string" || p.exp < now || used.has(p.n)) return null;
  used.set(p.n, p.exp);
  return p.uid;
}
