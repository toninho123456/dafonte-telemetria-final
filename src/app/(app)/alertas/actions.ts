"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, tenantScope } from "@/lib/permissions";
import { visibleWhere } from "@/lib/scope";
export async function markAllRead() {
  const u = await requireUser("alerts:view");
  await prisma.alert.updateMany({ where: { ...tenantScope(u), readAt: null, tractor: visibleWhere(u) }, data: { readAt: new Date() } });
  revalidatePath("/alertas"); revalidatePath("/", "layout");
}
