import { z } from "zod";
import { prisma } from "@/lib/db";
import { newToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";

// Resposta sempre igual: não revela se o e-mail existe.
export async function POST(req: Request) {
  const p = z.object({ email: z.string().email().toLowerCase() }).safeParse(await req.json().catch(() => null));
  if (p.success) {
    try {
      const u = await prisma.user.findUnique({ where: { email: p.data.email } });
      if (u && u.status === "ACTIVE") {
        const t = newToken();
        await prisma.passwordReset.create({ data: { userId: u.id, tokenHash: t.hash, expiresAt: new Date(Date.now() + 36e5) } });
        await sendMail(u.email, "Redefinir senha", `${process.env.APP_URL}/redefinir-senha?token=${t.raw}`);
      }
    } catch (e) { console.error(e) }
  }
  return Response.json({ ok: true });
}
