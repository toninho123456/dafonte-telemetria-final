import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { saveTenant } from "./actions";
export default async function Page({ searchParams }: { searchParams: { erro?: string; ok?: string } }) {
  const u = (await auth())!.user;
  if (u.role !== "ADMIN") notFound();
  const t = await prisma.tenant.findUniqueOrThrow({ where: { id: u.tenantId! } });
  const f = (name: string, label: string, v: string | null, extra = "") => <label className="grid gap-1 text-sm"><span className="text-zinc-400">{label}</span><input className="input" name={name} defaultValue={v ?? ""} {...(extra ? { placeholder: extra } : {})} /></label>;
  return (
    <div className="grid max-w-xl gap-3">
      <h1 className="text-xl font-bold">Dados da concessionária</h1>
      {searchParams.erro && <p role="alert" className="text-red-400">{searchParams.erro}</p>}
      {searchParams.ok && <p role="status" className="text-green-400">Salvo.</p>}
      <form action={saveTenant} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">{f("name", "Nome", t.name)}</div>
        {f("city", "Cidade", t.city)}{f("state", "Estado", t.state)}
        {f("phone", "Telefone", t.phone, "(83) 0000-0000")}{f("whatsapp", "WhatsApp (com DDI e DDD)", t.whatsapp, "5583900000000")}
        <div className="sm:col-span-2">{f("email", "E-mail de contato", t.email)}</div>
        <div className="sm:col-span-2">{f("address", "Endereço da loja", t.address, "Rua, número, bairro, Bayeux - PB")}</div>
        <button className="btn sm:col-span-2">Salvar</button></form>
      <p className="text-xs text-zinc-500">Esses dados aparecem no rodapé de todas as telas.</p>
    </div>
  );
}
