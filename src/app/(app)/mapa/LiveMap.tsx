"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";
import { statusOf, STATUS_LABEL, STATUS_COLOR } from "@/lib/status";

type P = { lat: number; lng: number; speed: number; heading: number | null; engineOn: boolean; recordedAt: string; receivedAt: string };
type T = { id: string; name: string; brand: string; model: string; p: P | null };

type Fence = { id: string; name: string; points: [number, number][] };
export default function LiveMap({ initial, fences = [] }: { initial: T[]; fences?: Fence[] }) {
  const [items, setItems] = useState<Record<string, T>>(() => Object.fromEntries(initial.map((t) => [t.id, t])));
  const [live, setLive] = useState(false), [ready, setReady] = useState(false), [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const el = useRef<HTMLDivElement>(null), map = useRef<LMap | null>(null), L = useRef<typeof import("leaflet") | null>(null);
  const markers = useRef(new Map<string, Marker>());

  // 1) cria o mapa (Leaflet só roda no navegador)
  useEffect(() => {
    let dead = false;
    (async () => {
      const lf = await import("leaflet");
      if (dead || !el.current) return;
      const m = lf.map(el.current).setView([-7.125, -34.932], 11); // Bayeux-PB, até haver posições
      lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      const pts = initial.filter((t) => t.p).map((t) => [t.p!.lat, t.p!.lng] as [number, number]);
      if (pts.length) m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
      map.current = m; L.current = lf; setReady(true);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; markers.current.clear(); setReady(false) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) relógio para detectar "sem sinal" mesmo sem mensagens novas
  useEffect(() => { setMounted(true); const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i) }, []);

  // 3) WebSocket com ingresso novo a cada conexão e reconexão com espera crescente
  useEffect(() => {
    let ws: WebSocket | null = null, timer: ReturnType<typeof setTimeout> | undefined, dead = false, tries = 0;
    const retry = () => { if (!dead) timer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** tries++)) };
    async function connect() {
      try {
        const r = await fetch("/api/ws-ticket", { method: "POST" });
        if (!r.ok) throw new Error("ticket");
        const { ticket } = await r.json();
        if (dead) return;
        ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?t=${encodeURIComponent(ticket)}`);
        ws.onopen = () => { tries = 0; setLive(true) };
        ws.onclose = () => { setLive(false); retry() };
        ws.onmessage = (ev) => {
          let m: { type?: string; id?: string; message?: string; tractorId?: string; tractorIds?: string[] } & Partial<P>;
          try { m = JSON.parse(ev.data) } catch { return }
          if (m.type === "point" && m.tractorId && typeof m.lat === "number" && typeof m.lng === "number") {
            const p: P = { lat: m.lat, lng: m.lng, speed: m.speed ?? 0, heading: m.heading ?? null, engineOn: !!m.engineOn, recordedAt: m.recordedAt ?? "", receivedAt: m.receivedAt ?? new Date().toISOString() };
            setItems((prev) => (prev[m.tractorId!] ? { ...prev, [m.tractorId!]: { ...prev[m.tractorId!], p } } : prev));
          } else if (m.type === "alert" && typeof m.message === "string") {
            const id = m.id ?? String(Math.random()), text = m.message;
            setToasts((p) => [...p.slice(-2), { id, text }]);
            setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 10_000);
          } else if (m.type === "revoked" && Array.isArray(m.tractorIds)) {
            setItems((prev) => { const n = { ...prev }; m.tractorIds!.forEach((id) => delete n[id]); return n });
          }
        };
      } catch { setLive(false); retry() }
    }
    connect();
    return () => { dead = true; clearTimeout(timer); ws?.close() };
  }, []);

  // 4) mantém os marcadores em dia
  useEffect(() => {
    const lf = L.current, m = map.current; if (!lf || !m) return;
    for (const [id, mk] of markers.current) if (!items[id]) { mk.remove(); markers.current.delete(id) }
    for (const t of Object.values(items)) {
      if (!t.p) continue;
      const color = STATUS_COLOR[statusOf(t.p, now)];
      const icon = lf.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 4px #000"></div>` });
      let mk = markers.current.get(t.id);
      if (!mk) {
        const label = document.createElement("span"); label.textContent = t.name; // textContent: nome nunca vira HTML
        mk = lf.marker([t.p.lat, t.p.lng], { icon }).bindTooltip(label).addTo(m);
        markers.current.set(t.id, mk);
      } else { mk.setLatLng([t.p.lat, t.p.lng]); mk.setIcon(icon) }
    }
  }, [items, ready, now]);

  // 5) áreas desenhadas
  useEffect(() => {
    const lf = L.current, m = map.current; if (!lf || !m) return;
    const g = lf.layerGroup(fences.map((f) => { const s = document.createElement("span"); s.textContent = f.name; return lf.polygon(f.points, { color: "#f2b01e", weight: 2, fillOpacity: 0.08 }).bindTooltip(s, { sticky: true }) })).addTo(m);
    return () => { g.remove() };
  }, [fences, ready]);

  const list = Object.values(items).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div className="grid gap-3 lg:grid-cols-[18rem_1fr]">
      <aside className="order-2 grid content-start gap-2 lg:order-1">
        <p className="text-sm"><span style={{ color: live ? "#22c55e" : "#ef4444" }}>●</span> {live ? "Ao vivo" : "Reconectando…"}</p>
        {toasts.map((t) => <p key={t.id} role="status" className="rounded-md border border-amber-500 bg-amber-950 p-2 text-sm">{t.text}</p>)}
        {list.map((t) => {
          const st = statusOf(t.p, now);
          return (
            <button key={t.id} type="button" disabled={!t.p} onClick={() => t.p && map.current?.flyTo([t.p.lat, t.p.lng], 16)} className="rounded-lg border border-zinc-800 p-2 text-left text-sm enabled:hover:bg-zinc-900">
              <b>{t.name}</b> <span className="text-zinc-500">{t.brand} {t.model}</span><br />
              <span style={{ color: STATUS_COLOR[st] }}>●</span> {STATUS_LABEL[st]}
              {t.p && <span className="text-zinc-400"> · {t.p.speed.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/h{mounted && ` · ${new Date(t.p.receivedAt).toLocaleTimeString("pt-BR")}`}</span>}
            </button>
          );
        })}
        {!list.length && <p className="text-sm text-zinc-400">Nenhum trator disponível para você.</p>}
      </aside>
      <div ref={el} className="isolate order-1 h-[65vh] rounded-lg lg:order-2" />
    </div>
  );
}
