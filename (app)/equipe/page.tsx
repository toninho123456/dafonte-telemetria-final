import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createUser, setRole, setStatus, resetPassword } from "./actions";
const ROLES: [string, string][] = [["ADMIN", "Administrador"], ["GESTOR", "Gestor"], ["ANALISTA", "Analista"], ["OPERADOR", "Operador"]];
export default async function Page({ searchParams }: { searchParams: { erro?: string } }) {
  const u = (await auth())!.user;
  if (u.role !== "ADMIN") notFound();
  const users = await prisma.user.findMany({ where: { tenantId: u.tenantId! }, orderBy: { name: "asc" } });
  return (
    <div className="grid max-w-4xl gap-5">
      <h1 className="text-xl font-bold">Equipe</h1>
      {searchParams.erro && <p role="alert" className="text-red-400">{searchParams.erro}</p>}
      <details className="rounded-lg border border-zinc-800 p-3" open={!!searchParams.erro}><summary className="cursor-pointer font-bold">Cadastrar pessoa</summary>
        <form action={createUser} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className="input" name="name" placeholder="Nome" required /><input className="input" name="email" type="email" placeholder="E-mail" required />
          <input className="input" name="phone" placeholder="Telefone (opcional)" /><input className="input" name="jobTitle" placeholder="Função (opcional)" />
          <select className="input" name="role" defaultValue="OPERADOR">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input className="input" name="password" type="text" autoComplete="off" placeholder="Senha inicial (mín. 10, letra e número)" required />
          <button className="btn sm:col-span-2">Cadastrar</button></form>
        <p className="mt-2 text-xs text-zinc-500">Combine a senha inicial com a pessoa; ela pode trocar em “Esqueci a senha”. Depois de cadastrar, libere os tratores em Tratores → Quem pode ver este trator.</p></details>
      <ul className="grid gap-2">{users.map((x) => { const self = x.id === u.id; return (
        <li key={x.id} className="rounded-lg border border-zinc-800 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{x.name}</b> {self && <small className="text-zinc-500">(você)</small>}<br /><small className="text-zinc-400">{x.email}{x.jobTitle ? ` · ${x.jobTitle}` : ""}{x.phone ? ` · ${x.phone}` : ""}</small></div>
            <span className={x.status === "ACTIVE" ? "text-green-400" : "text-red-400"}>{x.status === "ACTIVE" ? "Ativo" : "Bloqueado"}</span></div>
          {!self && <div className="mt-2 flex flex-wrap items-center gap-2">
            <form action={setRole.bind(null, x.id)} className="flex gap-1"><select className="input py-1" name="role" defaultValue={x.role}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><button className="btn-o py-1">Salvar cargo</button></form>
            <form action={setStatus.bind(null, x.id)}><button className="btn-o py-1">{x.status === "ACTIVE" ? "Bloquear" : "Desbloquear"}</button></form>
            <form action={resetPassword.bind(null, x.id)} className="flex gap-1"><input className="input py-1" name="password" autoComplete="off" placeholder="Nova senha" /><button className="btn-o py-1">Redefinir</button></form></div>}
        </li>) })}</ul>
    </div>
  );
}
