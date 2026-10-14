"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

const F: [string, string, string, boolean][] = [["name", "Nome completo", "text", true], ["farm", "Nome da fazenda ou empresa (opcional)", "text", false], ["phone", "Telefone (opcional)", "tel", false], ["email", "E-mail", "email", true], ["password", "Senha (10+ caracteres, letras e números)", "password", true]];
export default function Page() {
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(""); setBusy(true);
    const d = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => v));
    const r = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error ?? "Não foi possível criar a conta."); setBusy(false); return }
    const s = await signIn("credentials", { email: d.email, password: d.password, redirect: false });
    if (s?.error) { location.href = "/entrar"; return }
    location.href = "/";
  }
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">Criar conta</h1>
      <button className="btn-o mb-4 w-full" type="button" onClick={() => signIn("google", { callbackUrl: "/" })}>Continuar com Google</button>
      <p className="mb-3 text-center text-sm text-zinc-400">ou crie com e-mail e senha</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {F.map(([n, l, t, req]) => <input key={n} className="input" name={n} type={t} placeholder={l} required={req} maxLength={128} autoComplete={n === "password" ? "new-password" : n === "email" ? "email" : undefined} />)}
        {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
        <button className="btn" disabled={busy}>CRIAR CONTA</button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-400"><Link href="/entrar">Já tenho conta</Link></p>
    </main>
  );
}
