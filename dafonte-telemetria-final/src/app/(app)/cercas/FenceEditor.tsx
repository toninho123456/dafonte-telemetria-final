"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Polygon } from "leaflet";
type LL = [number, number];
type F = { id: string; name: string; points: LL[] };

export default function FenceEditor({ fences, canEdit }: { fences: F[]; canEdit: boolean }) {
  const el = useRef<HTMLDivElement>(null), map = useRef<LMap | null>(null), L = useRef<typeof import("leaflet") | null>(null);
  const pts = useRef<LL[]>([]), draft = useRef<Polygon | null>(null), polys = useRef(new Map<string, Polygon>());
  const [ready, setReady] = useState(false), [count, setCount] = useState(0), [name, setName] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const router = useRouter();

  const redraw = () => {
    const lf = L.current, m = map.current; if (!lf || !m) return;
    draft.current?.remove();
    draft.current = pts.current.length ? lf.polygon(pts.current, { color: "#22c55e", weight: 3, dashArray: "6" }).addTo(m) : null;
    setCount(pts.current.length);
  };
  useEffect(() => {
    let dead = false;
    (async () => {
      const lf = await import("leaflet");
      if (dead || !el.current) return;
      const m = lf.map(el.current).setView([-7.125, -34.932], 12);
      lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      m.on("click", (e) => { if (!canEdit) return; pts.current.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]); redraw() });
      map.current = m; L.current = lf; setReady(true);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; polys.current.clear(); draft.current = null; setReady(false) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { // áreas já salvas
    const lf = L.current, m = map.current; if (!lf || !m) return;
    polys.current.forEach((p) => p.remove()); polys.current.clear();
    for (const f of fences) {
      const label = document.createElement("span"); label.textContent = f.name;
      polys.current.set(f.id, lf.polygon(f.points, { color: "#f2b01e", weight: 2, fillOpacity: 0.12 }).bindTooltip(label, { sticky: true }).addTo(m));
    }
    if (fences.length && !pts.current.length) m.fitBounds(lf.latLngBounds(fences.flatMap((f) => f.points)), { padding: [30, 30] });
  }, [fences, ready]);

  async function save() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/geofences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, points: pts.current }) });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erro");
      pts.current = []; redraw(); setName(""); router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setBusy(false) }
  }
  async function del(f: F) {
    if (!confirm(`Excluir a área "${f.name}"? Os alertas antigos dela continuam no histórico.`)) return;
    const r = await fetch(`/api/geofences/${f.id}`, { method: "DELETE" });
    if (r.ok) router.refresh(); else setErr((await r.json()).error ?? "Erro");
  }
  return (
    <div className="grid gap-3 lg:grid-cols-[18rem_1fr]">
      <aside className="order-2 grid content-start gap-3 text-sm lg:order-1">
        {canEdit && (<div className="grid gap-2 rounded-lg border border-zinc-800 p-3">
          <b>Nova área</b>
          <p className="text-zinc-400">Toque no mapa para marcar os cantos (mínimo 3). Pontos: {count}</p>
          <input className="input" placeholder="Nome (ex.: Fazenda Boa Vista)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-o py-1" onClick={() => { pts.current.pop(); redraw() }} disabled={!count}>Desfazer</button>
            <button type="button" className="btn-o py-1" onClick={() => { pts.current = []; redraw() }} disabled={!count}>Limpar</button>
            <button type="button" className="btn py-1" onClick={save} disabled={busy || count < 3 || name.trim().length < 2}>Salvar</button>
          </div>
        </div>)}
        {err && <p role="alert" className="text-red-400">{err}</p>}
        {fences.map((f) => (<div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 p-2">
          <button type="button" className="text-left underline" onClick={() => L.current && map.current?.fitBounds(L.current.latLngBounds(f.points), { padding: [30, 30] })}>{f.name}</button>
          {canEdit && <button type="button" className="text-red-400" onClick={() => del(f)}>Excluir</button>}
        </div>))}
        {!fences.length && <p className="text-zinc-400">Nenhuma área cadastrada.</p>}
      </aside>
      <div ref={el} className="isolate order-1 h-[65vh] rounded-lg lg:order-2" />
    </div>
  );
}
