import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
// A chave só aparece uma vez (ao gerar). No banco fica apenas o hash SHA-256.
export const newKey = () => "dfk_" + randomBytes(24).toString("base64url");
export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
export function keyMatches(k: string, hash: string | null) {
  const a = Buffer.from(hashKey(k)), b = Buffer.from(hash ?? "0".repeat(64));
  return !!hash && a.length === b.length && timingSafeEqual(a, b);
}
