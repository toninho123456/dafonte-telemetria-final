import { randomBytes, createHash } from "crypto";
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
// o token cru vai por e-mail; só o hash fica no banco
export const newToken = () => { const raw = randomBytes(32).toString("hex"); return { raw, hash: hashToken(raw) } };
