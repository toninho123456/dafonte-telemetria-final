// Trava de força bruta no login: 5 erros por e-mail => 15 min bloqueado. Em memória (uma instância).
const fails = new Map<string, { n: number; until: number; last: number }>();
const MAX = 5, LOCK = 15 * 60_000;
export function isLocked(k: string) { const f = fails.get(k); return !!f && f.until > Date.now() }
export function addFail(k: string) {
  const now = Date.now(), f = fails.get(k);
  const n = f && now - f.last < LOCK ? f.n + 1 : 1;
  fails.set(k, { n, last: now, until: n >= MAX ? now + LOCK : 0 });
  if (fails.size > 10_000) fails.clear();
}
export const clearFails = (k: string) => { fails.delete(k) };

// Limite simples por chave (ex.: IP): no máximo `max` usos a cada `windowMs`. Em memória (uma instância).
const hits = new Map<string, number[]>();
export function tooMany(k: string, max: number, windowMs: number) {
  const now = Date.now(), list = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(k, list);
  if (hits.size > 10_000) hits.clear();
  return list.length > max;
}
