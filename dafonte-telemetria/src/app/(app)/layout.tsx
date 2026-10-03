import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { tenantScope, visibleWhere } from "@/lib/scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  if (!s?.user) redirect("/entrar");
  const u = s.user, can = (a: string) => u.role === "PLATFORM_ADMIN" || PERMS[a]?.includes(u.role);
  const tenant = u.tenantId ? await prisma.tenant.findUnique({ where: { id: u.tenantId } }) : null;
  const unread = can("alerts:view") ? await prisma.alert.count({ where: { ...tenantScope(u), readAt: null, tractor: visibleWhere(u) } }) : 0;
  const wa = tenant?.whatsapp?.replace(/\D/g, "");
  const links: [string, string, boolean][] = [
    ["/", "Início", true], ["/tratores", "Tratores", true], ["/mapa", "Mapa", can("map:view")],
    ["/alertas", unread ? `Alertas (${unread})` : "Alertas", can("alerts:view")], ["/cercas", "Áreas", can("alerts:view")],
    ["/estatisticas", "Desempenho", can("telemetry:view")], ["/dispositivos", "Dispositivos", u.role === "ADMIN"],
    ["/equipe", "Equipe", u.role === "ADMIN"], ["/auditoria", "Auditoria", can("audit:view") && u.role !== "PLATFORM_ADMIN"], ["/configuracoes", "Dados da loja", u.role === "ADMIN"],
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 p-3">
        <img src={tenant?.logoUrl ?? "/brand/dafonte.jpg"} alt={tenant?.name ?? "Logo"} className="h-12" />
        <form action={async () => { "use server"; await signOut({ redirectTo: "/entrar" }) }} className="flex items-center gap-3 text-sm">
          <span>{u.name}<br /><small className="text-zinc-400">{u.role}</small></span>
          <button className="btn-o">Sair</button>
        </form>
      </header>
      <nav className="flex gap-4 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-4 py-2 text-sm text-zinc-300">
        {links.filter((l) => l[2]).map(([href, label]) => <Link key={href} href={href} className={label.startsWith("Alertas (") ? "font-bold text-amber-400" : ""}>{label}</Link>)}
      </nav>
      <div className="flex-1 p-4">{children}</div>
      <footer className="border-t border-zinc-800 p-4 text-xs text-zinc-400">
        <b className="text-zinc-300">{tenant?.name ?? "Dafonte Tratores"}</b>
        {(tenant?.address || tenant?.city) && <> · {tenant?.address ?? `${tenant?.city}${tenant?.state ? ` - ${tenant.state}` : ""}`}</>}
        {tenant?.phone && <> · <a href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`} className="underline">{tenant.phone}</a></>}
        {wa && <> · <a href={`https://wa.me/${wa}`} className="underline" target="_blank" rel="noopener noreferrer">WhatsApp</a></>}
        {tenant?.email && <> · <a href={`mailto:${tenant.email}`} className="underline">{tenant.email}</a></>}
      </footer>
    </div>
  );
}
