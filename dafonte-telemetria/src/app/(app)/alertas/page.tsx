import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { tenantScope, visibleWhere } from "@/lib/scope";
import { markAllRead } from "./actions";
export default async function Page() {
  const u = (await auth())!.user;
  if (u.role !== "PLATFORM_ADMIN" && !PERMS["alerts:view"].includes(u.role)) notFound();
  const rows = await prisma.alert.findMany({ where: { ...tenantScope(u), tractor: visibleWhere(u) }, orderBy: { createdAt: "desc" }, take: 200 });
  const unread = rows.filter((a) => !a.readAt).length;
  return (
    <div className="grid max-w-3xl gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Alertas</h1>
        {unread > 0 && <form action={markAllRead}><button className="btn-o py-1">Marcar {unread} como lido(s)</button></form>}</div>
      <ul className="grid gap-2">{rows.map((a) => (
        <li key={a.id} className={`rounded-lg border p-3 text-sm ${a.readAt ? "border-zinc-800 text-zinc-400" : "border-amber-500"}`}>
          <span style={{ color: a.kind === "ENTER" ? "#22c55e" : "#f2b01e" }}>●</span> {a.message}
          <br /><small className="text-zinc-500">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}</small></li>))}</ul>
      {!rows.length && <p className="text-zinc-400">Nenhum alerta ainda. Crie áreas em “Áreas” e os alertas de entrada e saída aparecem aqui.</p>}
    </div>
  );
}
