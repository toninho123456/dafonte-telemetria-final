"use client";
import { useEffect, useRef, useState } from "react";
export default function Tracker() {
  const [deviceId, setDeviceId] = useState(""), [key, setKey] = useState(""), [engine, setEngine] = useState(true), [on, setOn] = useState(false), [log, setLog] = useState("");
  const pos = useRef<GeolocationPosition | null>(null);
  useEffect(() => { setDeviceId(localStorage.getItem("trk_id") ?? "") }, []);
  useEffect(() => {
    if (!on) return;
    if (!navigator.geolocation) { setLog("Este aparelho não tem GPS no navegador."); setOn(false); return }
    localStorage.setItem("trk_id", deviceId); // a chave NÃO é guardada
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then((l) => { lock = l }).catch(() => {});
    const w = navigator.geolocation.watchPosition((p) => { pos.current = p }, (e) => setLog(`GPS: ${e.message}`), { enableHighAccuracy: true, maximumAge: 1000, timeout: 20_000 });
    const t = setInterval(async () => {
      const p = pos.current; if (!p) { setLog("Aguardando sinal de GPS…"); return }
      const c = p.coords, body = { deviceId, lat: c.latitude, lng: c.longitude, speed: Math.min(120, Math.max(0, (c.speed ?? 0) * 3.6)), heading: c.heading != null && isFinite(c.heading) ? c.heading : undefined, engineOn: engine, timestamp: new Date(p.timestamp).toISOString() };
      try {
        const r = await fetch("/api/telemetry", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
        setLog(r.ok ? `Enviado às ${new Date().toLocaleTimeString("pt-BR")}` : `Erro ${r.status}: ${(await r.json().catch(() => ({}))).error ?? ""}`);
      } catch { setLog("Sem internet; tentando de novo…") }
    }, 2000);
    return () => { navigator.geolocation.clearWatch(w); clearInterval(t); lock?.release().catch(() => {}); pos.current = null };
  }, [on, deviceId, key, engine]);
  return (
    <div className="grid gap-3">
      <input className="input" placeholder="ID do dispositivo" value={deviceId} onChange={(e) => setDeviceId(e.target.value.trim())} disabled={on} />
      <input className="input" placeholder="Chave (dfk_...)" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value.trim())} disabled={on} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={engine} onChange={(e) => setEngine(e.target.checked)} />Motor ligado</label>
      <button className="btn" onClick={() => setOn(!on)} disabled={!deviceId || !key}>{on ? "Parar" : "Começar a enviar"}</button>
      {log && <p role="status" className="text-sm text-zinc-300">{log}</p>}
    </div>
  );
}
