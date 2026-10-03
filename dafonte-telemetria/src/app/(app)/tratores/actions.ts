"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { savePhoto, deletePhoto } from "@/lib/storage";

async function admin(action = "tractor:write") {
  const u = await requireUser(action);
  if (!u.tenantId) throw new Error("Use uma conta de concessionária");
  return { ...u, tenantId: u.tenantId };
}
const back = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);
const uniq = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const num = (a: number, b: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(a).max(b).optional());
const opt = (n: number) => z.string().trim().max(n).optional();
const TR = z.object({ name: z.string().trim().min(2).max(80), brand: z.string().trim().min(1).max(40), model: z.string().trim().min(1).max(40), year: num(1950, 2100), serial: opt(60), hours: num(0, 1e6), farm: opt(80), operator: opt(80), notes: opt(500) });
const own = async (tenantId: string, id: string) => (await prisma.tractor.findFirst({ where: { id, tenantId } })) ?? back("/tratores", "Trator não encontrado.");

export async function createTractor(fd: FormData) {
  const u = await admin();
  const p = TR.safeParse(Object.fromEntries(fd));
  if (!p.success) back("/tratores/novo", "Confira os campos: nome, marca e modelo são obrigatórios.");
  const devId = String(fd.get("deviceId") || "");
  if (devId && !(await prisma.device.findFirst({ where: { id: devId, tenantId: u.tenantId, tractorId: null } }))) back("/tratores/novo", "Dispositivo inválido ou já vinculado.");
  let photoPath: string | undefined;
  const f = fd.get("photo");
  if (f instanceof File && f.size > 0) { try { photoPath = await savePhoto(u.tenantId, f) } catch (e) { back("/tratores/novo", (e as Error).message) } }
  const t = await prisma.tractor.create({ data: { ...p.data!, tenantId: u.tenantId, photoPath, device: devId ? { connect: { id: devId } } : undefined } });
  await audit(u, `cadastrou o trator ${t.name}`, { tractorId: t.id });
  revalidatePath("/tratores"); redirect(`/tratores/${t.id}`);
}
export async function updateTractor(id: string, fd: FormData) {
  const u = await admin(); const t = await own(u.tenantId, id);
  const p = TR.safeParse(Object.fromEntries(fd));
  if (!p.success) back(`/tratores/${id}`, "Confira os campos.");
  await prisma.tractor.update({ where: { id: t.id }, data: p.data! });
  await audit(u, `alterou o trator ${t.name}`, { tractorId: t.id });
  revalidatePath(`/tratores/${id}`); redirect(`/tratores/${id}`);
}
export async function deleteTractor(id: string, fd: FormData) {
  const u = await admin(); const t = await own(u.tenantId, id);
  if (fd.get("confirm") !== "on") back(`/tratores/${id}`, "Marque a confirmação para excluir.");
  await deletePhoto(t.photoPath);
  await prisma.tractor.delete({ where: { id: t.id } });
  await audit(u, `excluiu o trator ${t.name}`, { tractorId: t.id });
  revalidatePath("/tratores"); redirect("/tratores");
}
export async function uploadPhoto(id: string, fd: FormData) {
  const u = await admin(); const t = await own(u.tenantId, id);
  const f = fd.get("photo");
  if (!(f instanceof File) || !f.size) back(`/tratores/${id}`, "Escolha uma foto.");
  let path = "";
  try { path = await savePhoto(u.tenantId, f as File) } catch (e) { back(`/tratores/${id}`, (e as Error).message) }
  await prisma.tractor.update({ where: { id: t.id }, data: { photoPath: path } });
  await deletePhoto(t.photoPath);
  await audit(u, `trocou a foto do trator ${t.name}`, { tractorId: t.id });
  redirect(`/tratores/${id}`);
}
export async function removePhoto(id: string) {
  const u = await admin(); const t = await own(u.tenantId, id);
  await prisma.tractor.update({ where: { id: t.id }, data: { photoPath: null } });
  await deletePhoto(t.photoPath);
  await audit(u, `removeu a foto do trator ${t.name}`, { tractorId: t.id });
  redirect(`/tratores/${id}`);
}
export async function setAccess(id: string, fd: FormData) {
  const u = await admin("user:manage"); const t = await own(u.tenantId, id);
  const ids = fd.getAll("userId").map(String);
  const ok = await prisma.user.findMany({ where: { id: { in: ids }, tenantId: u.tenantId, role: { not: "ADMIN" }, status: "ACTIVE" }, select: { id: true } });
  await prisma.$transaction([prisma.tractorAccess.deleteMany({ where: { tractorId: t.id } }), prisma.tractorAccess.createMany({ data: ok.map((x) => ({ userId: x.id, tractorId: t.id })) })]);
  await audit(u, `alterou as permissões do trator ${t.name}`, { tractorId: t.id });
  redirect(`/tratores/${id}`);
}
export async function assignDevice(id: string, fd: FormData) {
  const u = await admin("device:write"); const t = await own(u.tenantId, id);
  const devId = String(fd.get("deviceId") || "");
  if (devId && !(await prisma.device.findFirst({ where: { id: devId, tenantId: u.tenantId, OR: [{ tractorId: null }, { tractorId: t.id }] } }))) back(`/tratores/${id}`, "Dispositivo inválido ou já vinculado a outro trator.");
  await prisma.$transaction([prisma.device.updateMany({ where: { tractorId: t.id }, data: { tractorId: null } }), ...(devId ? [prisma.device.update({ where: { id: devId }, data: { tractorId: t.id } })] : [])]);
  await audit(u, devId ? `vinculou um dispositivo ao trator ${t.name}` : `desvinculou o dispositivo do trator ${t.name}`, { tractorId: t.id });
  redirect(`/tratores/${id}`);
}
export async function createDevice(fd: FormData) {
  const u = await admin("device:write");
  const p = z.object({ deviceId: z.string().trim().min(3).max(64).regex(/^[\w.:-]+$/), imei: z.string().trim().regex(/^\d{14,16}$/).optional().or(z.literal("")), tractorId: z.string().optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) back("/dispositivos", "ID: 3 a 64 caracteres (letras, números, . : _ -). IMEI: 14 a 16 dígitos.");
  const d = p.data!, tid = d.tractorId || undefined;
  if (tid && !(await prisma.tractor.findFirst({ where: { id: tid, tenantId: u.tenantId, device: { is: null } } }))) back("/dispositivos", "Trator inválido ou já possui dispositivo.");
  let dup = false;
  try { await prisma.device.create({ data: { tenantId: u.tenantId, deviceId: d.deviceId, imei: d.imei || null, tractorId: tid } }) } catch (e) { if (uniq(e)) dup = true; else throw e }
  if (dup) back("/dispositivos", "Esse ID ou IMEI já está em uso.");
  await audit(u, `cadastrou o dispositivo ${d.deviceId}`, { tractorId: tid });
  revalidatePath("/dispositivos"); redirect("/dispositivos");
}
export async function linkDevice(id: string, fd: FormData) {
  const u = await admin("device:write");
  const dev = (await prisma.device.findFirst({ where: { id, tenantId: u.tenantId } })) ?? back("/dispositivos", "Dispositivo não encontrado.");
  const tid = String(fd.get("tractorId") || "");
  if (tid && !(await prisma.tractor.findFirst({ where: { id: tid, tenantId: u.tenantId, device: { is: null } } }))) back("/dispositivos", "Trator inválido ou já possui dispositivo.");
  await prisma.device.update({ where: { id: dev.id }, data: { tractorId: tid || null } });
  await audit(u, tid ? `vinculou o dispositivo ${dev.deviceId} a um trator` : `desvinculou o dispositivo ${dev.deviceId}`, { tractorId: tid || undefined });
  redirect("/dispositivos");
}
export async function deleteDevice(id: string) {
  const u = await admin("device:write");
  const dev = await prisma.device.findFirst({ where: { id, tenantId: u.tenantId } });
  if (dev) { await prisma.device.delete({ where: { id } }); await audit(u, `excluiu o dispositivo ${dev.deviceId}`) }
  redirect("/dispositivos");
}
