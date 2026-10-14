import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSelfAccount } from "@/lib/signup";
import { tooMany } from "@/lib/ratelimit";
import { HttpError, fail } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().trim().email().toLowerCase(),
  password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/\d/),
  phone: z.string().trim().max(30).optional(), farm: z.string().trim().max(80).optional(),
});

// Qualquer pessoa cria a própria conta (ativa na hora) e passa a cadastrar os próprios tratores.
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
    if (tooMany(`signup:${ip}`, 10, 60 * 60_000)) throw new HttpError(429, "Muitos cadastros deste computador. Tente de novo mais tarde.");
    const d = schema.parse(await req.json());
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, "E-mail já cadastrado. Entre com ele ou use \"Esqueci minha senha\".");
    const user = await createSelfAccount({ ...d, passwordHash: await bcrypt.hash(d.password, 12) }).catch((e: unknown) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "E-mail já cadastrado.");
      throw e;
    });
    await audit(user, "criou a própria conta");
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "Dados inválidos. A senha precisa de 10+ caracteres, com letras e números.", fields: e.flatten().fieldErrors }, { status: 400 });
    return fail(e);
  }
}
