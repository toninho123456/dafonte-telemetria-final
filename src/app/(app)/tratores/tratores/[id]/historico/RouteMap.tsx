"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap } from "leaflet";
export default function RouteMap({ line }: { line: [number, number][] }) {
  const el = useRef<HTMLDivElement>(null), map = useRef<LMap | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      const L = await import("leaflet");
      if (dead || !el.current) return;
      const m = L.map(el.current).setView([-7.125, -34.932], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      if (line.length) {
        const pl = L.polyline(line, { color: "#f2b01e", weight: 4 }).addTo(m);
        L.circleMarker(line[0], { radius: 8, color: "#fff", fillColor: "#22c55e", fillOpacity: 1 }).bindTooltip("Início").addTo(m);
        L.circleMarker(line[line.length - 1], { radius: 8, color: "#fff", fillColor: "#ef4444", fillOpacity: 1 }).bindTooltip("Fim").addTo(m);
        m.fitBounds(pl.getBounds(), { padding: [30, 30] });
      }
      map.current = m;
    })();
    return () => { dead = true; map.current?.remove(); map.current = null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={el} className="isolate h-[65vh] rounded-lg" />;
}
