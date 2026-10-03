import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
const ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
// Confere o conteúdo real do arquivo, não o nome nem o tipo informado pelo navegador.
function sniff(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}
export async function savePhoto(tenantId: string, f: File) {
  if (f.size > 5 * 1024 * 1024) throw new Error("A foto deve ter no máximo 5 MB.");
  const buf = Buffer.from(await f.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new Error("Envie uma foto JPG, PNG ou WebP.");
  const rel = `${tenantId}/${randomBytes(16).toString("hex")}.${ext}`;
  await fs.mkdir(path.join(ROOT, tenantId), { recursive: true });
  await fs.writeFile(path.join(ROOT, rel), buf);
  return rel;
}
const safe = (rel: string) => { const p = path.resolve(ROOT, rel); if (!p.startsWith(ROOT + path.sep)) throw new Error("Caminho inválido"); return p };
export async function readPhoto(rel: string) { return { buf: await fs.readFile(safe(rel)), mime: MIME[rel.split(".").pop()!] ?? "application/octet-stream" } }
export async function deletePhoto(rel?: string | null) { if (rel) await fs.rm(safe(rel), { force: true }) }
