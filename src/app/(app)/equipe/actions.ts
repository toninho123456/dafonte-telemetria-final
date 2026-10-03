"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { audit } from "@/lib/audit";

async function admin() {
  const u = await requireUser("user:manage");
  if (!u.tenantId) throw new Error("Use uma conta de concessionária");
  return { ...u, tenantId: u.tenantId };
}
const back = (msg: string): never => redirect(`/equipe?erro=${encodeURIComponent(msg)}`);
const Role = z.enum(["ADMIN", "GESTOR", "ANALISTA", "OPERADOR"]);
const Pw = z.string().min(10, "Senha: mínimo 10 caracteres").max(128).regex(/[A-Za-z]/, "Senha precisa de letra").regex(/\d/, "Senha precisa de número");
async function target(tenantId: string, selfId: string, id: string) {
  if (id === selfId) back("Você não pode alterar a própria conta aqui.");
  return (await prisma.user.findFirst({ where: { id, tenantId } })) ?? back("Usuário não encontrado.");
}
export async function createUser(fd: FormData) {
  const u = await admin();
  const p = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email(), role: Role, password: Pw, phone: z.string().trim().max(30).optional(), jobTitle: z.string().trim().max(60).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) back(p.error.issues[0].message);
  const d = p.data!;
  let dup = false;
  try { await prisma.user.create({ data: { tenantId: u.tenantId, name: d.name, email: d.email, role: d.role, phone: d.phone || null, jobTitle: d.jobTitle || null, passwordHash: await bcrypt.hash(d.password, 12) } }) }
  catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") dup = true; else throw e }
  if (dup) back("Esse e-mail já está cadastrado.");
  await audit(u, `cadastrou o usuário ${d.email} (${d.role})`);
  revalidatePath("/equipe"); redirect("/equipe");
}
export async function setRole(id: string, fd: FormData) {
  const u = await admin(); const t = await target(u.tenantId, u.id, id);
  const role = Role.safeParse(fd.get("role")); if (!role.success) back("Cargo inválido.");
  await prisma.user.update({ where: { id: t.id }, data: { role: role.data } });
  if (role.data === "ADMIN") await prisma.tractorAccess.deleteMany({ where: { userId: t.id } }); // administrador vê tudo
  await audit(u, `alterou o cargo de ${t.email} para ${role.data}`);
  revalidatePath("/equipe");
}
export async function setStatus(id: string) {
  const u = await admin(); const t = await target(u.tenantId, u.id, id);
  const status = t.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
  await prisma.user.update({ where: { id: t.id }, data: { status } });
  await audit(u, `${status === "BLOCKED" ? "bloqueou" : "desbloqueou"} o usuário ${t.email}`);
  revalidatePath("/equipe");
}
export async function resetPassword(id: string, fd: FormData) {
  const u = await admin(); const t = await target(u.tenantId, u.id, id);
  const pw = Pw.safeParse(fd.get("password")); if (!pw.success) back(pw.error.issues[0].message);
  await prisma.user.update({ where: { id: t.id }, data: { passwordHash: await bcrypt.hash(pw.data!, 12) } });
  await audit(u, `redefiniu a senha de ${t.email}`);
  revalidatePath("/equipe");
}
