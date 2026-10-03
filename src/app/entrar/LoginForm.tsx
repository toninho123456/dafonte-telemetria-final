"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginForm({ error }: { error?: string }) {
  const [msg, setMsg] = useState(error ? "Não foi possível entrar. Confira os dados ou peça acesso ao administrador da sua concessionária." : "");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget);
    const r = await signIn("credentials", { email: f.get("email"), password: f.get("password"), redirect: false });
    if (r?.error) { setMsg("E-mail ou senha inválidos."); setBusy(false) } else location.href = "/";
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <img src="/brand/dafonte.jpg" alt="Dafonte Tratores" className="w-56" />
      <h1 className="text-2xl font-bold">Monitoramento inteligente de máquinas agrícolas</h1>
      <button className="btn-o w-full" onClick={() => signIn("google", { callbackUrl: "/" })}>Continuar com Google</button>
      <form onSubmit={submit} className="flex w-full flex-col gap-3 text-left">
        <input className="input" name="email" type="email" placeholder="E-mail" required autoComplete="email" />
        <input className="input" name="password" type="password" placeholder="Senha" required autoComplete="current-password" />
        {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
        <button className="btn" disabled={busy}>ENTRAR</button>
      </form>
      <div className="flex gap-4 text-sm text-zinc-400"><Link href="/esqueci-senha">Esqueci minha senha</Link><Link href="/cadastro">Cadastrar concessionária</Link></div>
    </main>
  );
}
