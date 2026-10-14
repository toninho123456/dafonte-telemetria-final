import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase(), pw = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !pw || pw.length < 10) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (mín. 10 caracteres) no .env");
  const t = await p.tenant.upsert({ where: { slug: "dafonte-bayeux" }, update: {}, create: { slug: "dafonte-bayeux", name: "Dafonte Tratores", city: "Bayeux", state: "PB", country: "BR", logoUrl: "/brand/dafonte.jpg", active: true } });
  await p.user.upsert({ where: { email }, update: {}, create: { email, name: "Administrador", role: "ADMIN", tenantId: t.id, passwordHash: await bcrypt.hash(pw, 12) } });
}
main().finally(() => p.$disconnect());
