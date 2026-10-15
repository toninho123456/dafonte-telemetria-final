import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "conta";

// Conta de cliente (produtor): cria uma "conta" própria e já ativa, com a pessoa como administradora.
// Os tratores dela ficam isolados das demais contas (tudo é filtrado por tenantId).
export async function createSelfAccount(d: { email: string; name: string; passwordHash?: string; phone?: string; farm?: string }) {
  const label = d.farm?.trim() || `Conta de ${d.name}`;
  return prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({ data: { slug: `${slugify(label)}-${randomBytes(3).toString("hex")}`, name: label.slice(0, 80), active: true, selfService: true } });
    return tx.user.create({
      data: { tenantId: t.id, email: d.email.toLowerCase(), name: d.name.slice(0, 100), role: "ADMIN", passwordHash: d.passwordHash, phone: d.phone, unverifiedSignup: !!d.passwordHash },
    });
  });
}
