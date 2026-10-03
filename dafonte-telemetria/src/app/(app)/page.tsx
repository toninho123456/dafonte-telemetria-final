import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { visibleWhere } from "@/lib/tractors";
export default async function Home() {
  const u = (await auth())!.user;
  const [t, n] = await Promise.all([u.tenantId ? prisma.tenant.findUnique({ where: { id: u.tenantId } }) : null, prisma.tractor.count({ where: visibleWhere(u) })]);
  return (<div><h1 className="text-xl font-bold">{t?.name ?? "Plataforma"}</h1><p className="text-zinc-400">{t?.city}{t?.state ? ` - ${t.state}` : ""} · {n} trator(es) disponível(is) para você.</p></div>);
}
