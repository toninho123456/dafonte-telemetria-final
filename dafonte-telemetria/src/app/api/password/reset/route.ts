import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export async function POST(req: Request) {
  const p = z.object({ token: z.string().length(64), password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/\d/) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Senha precisa de 10+ caracteres, com letras e números." }, { status: 400 });
  const r = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(p.data.token) } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return Response.json({ error: "Link inválido ou expirado." }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: r.userId }, data: { passwordHash: await bcrypt.hash(p.data.password, 12) } }),
    prisma.passwordReset.updateMany({ where: { userId: r.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  return Response.json({ ok: true });
}
