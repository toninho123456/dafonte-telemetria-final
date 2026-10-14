import { createHash, randomInt } from "node:crypto";
// Código de ativação: sem letras parecidas (0/O, 1/I/L). Só o hash fica no banco; o código aparece uma vez para a loja.
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newClaimCode = () => { const c = Array.from({ length: 8 }, () => ALPHA[randomInt(ALPHA.length)]).join(""); return `DFT-${c.slice(0, 4)}-${c.slice(4)}` };
export const normalizeClaim = (s: string) => { const c = s.toUpperCase().replace(/[^A-Z0-9]/g, ""); return c.length === 11 && c.startsWith("DFT") ? c.slice(3) : c };
export const hashClaim = (s: string) => createHash("sha256").update(normalizeClaim(s)).digest("hex");
export const CLAIM_DAYS = 90;
