"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function DeviceKey({ id, hasKey }: { id: string; hasKey: boolean }) {
  const [key, setKey] = useState<string | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const router = useRouter();
  async function gen() {
    if (hasKey && !confirm("Gerar uma nova chave desativa a atual. O dispositivo precisará ser reconfigurado. Continuar?")) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/devices/${id}/key`, { method: "POST" }), j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      setKey(j.key); router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setBusy(false) }
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" className="btn-o py-1" onClick={gen} disabled={busy}>{hasKey ? "Nova chave" : "Gerar chave"}</button>
      {!hasKey && !key && <small className="text-amber-400">sem chave</small>}
      {key && <p className="max-w-xs text-xs">Copie agora, ela não será mostrada de novo:<br /><code className="break-all select-all text-amber-300">{key}</code></p>}
      {err && <small role="alert" className="text-red-400">{err}</small>}
    </div>
  );
}
