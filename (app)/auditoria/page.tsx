import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { tenantScope } from "@/lib/scope";
export default async function Page() {
  const u = (await auth())!.user;
  if (u.role !== "PLATFORM_ADMIN" && !PERMS["audit:view"].includes(u.role)) notFound();
  const logs = await prisma.auditLog.findMany({ where: tenantScope(u), include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <div className="grid gap-3">
      <h1 className="text-xl font-bold">Auditoria</h1>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="text-zinc-400"><tr><th className="p-2">Quando</th><th>Quem</th><th>Ação</th><th>IP</th></tr></thead>
        <tbody>{logs.map((l) => (<tr key={l.id} className="border-t border-zinc-800 align-top"><td className="whitespace-nowrap p-2 text-zinc-400">{l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}</td><td>{l.user?.name ?? "—"}</td><td>{l.action}</td><td className="text-zinc-500">{l.ip ?? "—"}</td></tr>))}</tbody></table>
        {!logs.length && <p className="p-2 text-zinc-400">Nada registrado ainda.</p>}</div>
      <p className="text-xs text-zinc-500">Mostrando as últimas 300 ações.</p>
    </div>
  );
}
