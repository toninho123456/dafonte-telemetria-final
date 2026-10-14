"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Loja: gera o código de ativação do trator para entregar ao comprador (mostrado uma única vez).
export default function ClaimCode({ id, active }: { id: string; active: boolean }) {
  const [code, setCode] = useState<string | null>(null), [days, setDays] = useState(90), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const router = useRouter();
  async function gen() {
    if (active && !confirm("Já existe um código ativo. Gerar outro invalida o anterior. Continuar?")) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/tractors/${id}/claim-code`, { method: "POST" }), j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      setCode(j.code); setDays(j.days); router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setBusy(false) }
  }
  return (
    <div className="grid gap-2 text-sm">
      <p className="text-zinc-400">Entregue este código ao comprador (na nota ou no contrato). Com ele, o trator, o rastreador e o histórico passam para a conta do cliente. O código vale uma vez só.</p>
      <div><button type="button" className="btn-o" onClick={gen} disabled={busy}>{active ? "Gerar novo código" : "Gerar código de ativação"}</button></div>
      {active && !code && <small className="text-amber-400">Já existe um código ativo (por segurança ele não é mostrado de novo).</small>}
      {code && <p>Copie agora, ele não será mostrado de novo:<br /><code className="select-all text-lg text-amber-300">{code}</code><br /><small className="text-zinc-400">Válido por {days} dias.</small></p>}
      {err && <small role="alert" className="text-red-400">{err}</small>}
    </div>
  );
}
