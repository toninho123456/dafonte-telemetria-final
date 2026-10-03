import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { visibleWhere } from "@/lib/tractors";
import { readPhoto } from "@/lib/storage";
import { HttpError, fail } from "@/lib/http";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const u = await requireUser();
    const t = await prisma.tractor.findFirst({ where: { id: params.id, ...visibleWhere(u) }, select: { photoPath: true } });
    if (!t?.photoPath) throw new HttpError(404, "Sem foto");
    const f = await readPhoto(t.photoPath);
    return new Response(new Uint8Array(f.buf), { headers: { "Content-Type": f.mime, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return fail(e) }
}
