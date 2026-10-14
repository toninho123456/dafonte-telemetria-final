"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { audit } from "@/lib/audit";
const o = (n: number) => z.string().trim().max(n).optional().transform((v) => v || null);
export async function saveTenant(fd: FormData) {
  const u = await requireUser("tenant:write");
  if (!u.tenantId) throw new Error("Use uma conta de concessionária");
  const p = z.object({ name: z.string().trim().min(2).max(80), city: o(80), state: o(40), phone: o(30), whatsapp: o(30), email: z.string().trim().email().max(120).optional().or(z.literal("")).transform((v) => v || null), address: o(160) }).safeParse(Object.fromEntries(fd));
  if (!p.success) redirect(`/configuracoes?erro=${encodeURIComponent("Confira os campos (nome e e-mail válidos).")}`);
  await prisma.tenant.update({ where: { id: u.tenantId }, data: p.data! });
  await audit(u, "atualizou os dados da concessionária");
  revalidatePath("/", "layout"); redirect("/configuracoes?ok=1");
}
