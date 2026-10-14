"use client";
import { useState } from "react";

// Cliente: digita o código de ativação entregue pela Dafonte e o trator passa para a conta dele.
export default function ClaimForm() {
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }), j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Não foi possível ativar.");
      location.href = `/tratores/${j.id}`;
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="mb-4 grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <b>Ativar meu trator</b>
      <p className="text-sm text-zinc-400">Digite o código de ativação que a Dafonte entregou na compra (ex.: DFT-AB12-CD34).</p>
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DFT-XXXX-XXXX" required maxLength={20} autoComplete="off" />
        <button className="btn" disabled={busy}>ATIVAR</button>
      </div>
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
