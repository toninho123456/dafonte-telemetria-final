"use client";
import { useState } from "react";
export default function Page() {
  const [msg, setMsg] = useState(""), [ok, setOk] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = new URLSearchParams(location.search).get("token");
    const r = await fetch("/api/password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: new FormData(e.currentTarget).get("password") }) });
    const j = await r.json(); if (r.ok) setOk(true); else setMsg(j.error);
  }
  if (ok) return <main className="mx-auto max-w-sm p-6"><p>Senha alterada. <a className="underline" href="/entrar">Entrar</a></p></main>;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">Nova senha</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="input" name="password" type="password" placeholder="Nova senha (10+ caracteres, letras e números)" required />
        {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
        <button className="btn">SALVAR SENHA</button>
      </form>
    </main>
  );
}
