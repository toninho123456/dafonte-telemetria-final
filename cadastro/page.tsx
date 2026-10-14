"use client";
import { useState } from "react";
import Link from "next/link";

const F: [string, string, string, boolean][] = [["dealer", "Concessionária", "text", true], ["city", "Cidade", "text", false], ["state", "Estado", "text", false], ["country", "País (2 letras, ex.: BR)", "text", false], ["name", "Nome completo", "text", true], ["jobTitle", "Cargo", "text", false], ["phone", "Telefone", "tel", false], ["email", "E-mail", "email", true], ["password", "Senha (10+ caracteres, letras e números)", "password", true]];
export default function Page() {
  const [msg, setMsg] = useState(""), [ok, setOk] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg("");
    const d = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => v));
    const r = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const j = await r.json(); if (r.ok) setOk(true); else setMsg(j.error);
  }
  if (ok) return <main className="mx-auto max-w-sm p-6 text-center"><h1 className="text-xl font-bold">Cadastro recebido</h1><p className="my-3 text-zinc-400">A concessionária será liberada após a aprovação da plataforma.</p><Link className="btn-o block" href="/entrar">Voltar ao login</Link></main>;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">Cadastrar concessionária</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {F.map(([n, l, t, req]) => <input key={n} className="input" name={n} type={t} placeholder={l} required={req} maxLength={128} />)}
        {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
        <button className="btn">CRIAR CADASTRO</button>
      </form>
    </main>
  );
}
