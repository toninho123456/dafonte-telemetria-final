"use client";
import { useState } from "react";
export default function Page() {
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch("/api/password/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: new FormData(e.currentTarget).get("email") }) });
    setSent(true);
  }
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-bold">Recuperar senha</h1>
      {sent ? <p className="text-zinc-300">Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.</p> :
        <form onSubmit={submit} className="flex flex-col gap-3"><input className="input" name="email" type="email" placeholder="E-mail" required /><button className="btn">ENVIAR LINK</button></form>}
    </main>
  );
}
