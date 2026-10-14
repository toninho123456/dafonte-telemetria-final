import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { HttpError, fail } from "@/lib/http";

const schema = z.object({
  dealer: z.string().min(2).max(80), city: z.string().max(80).optional(), state: z.string().max(40).optional(),
  country: z.string().length(2).default("BR"), name: z.string().min(2).max(100), email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/\d/), phone: z.string().max(30).optional(), jobTitle: z.string().max(60).optional(),
});
const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Cria uma concessionária (inativa até a plataforma aprovar) e seu primeiro administrador.
export async function POST(req: Request) {
  try {
    const d = schema.parse(await req.json());
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, "E-mail já cadastrado");
    const passwordHash = await bcrypt.hash(d.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({ data: { slug: `${slugify(d.dealer)}-${randomBytes(2).toString("hex")}`, name: d.dealer, city: d.city, state: d.state, country: d.country.toUpperCase() } });
      return tx.user.create({ data: { tenantId: t.id, email: d.email, name: d.name, role: "ADMIN", passwordHash, phone: d.phone, jobTitle: d.jobTitle } });
    });
    await audit(user, "cadastrou a concessionária (aguardando aprovação)");
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "Dados inválidos. A senha precisa de 10+ caracteres, com letras e números.", fields: e.flatten().fieldErrors }, { status: 400 });
    return fail(e);
  }
}
