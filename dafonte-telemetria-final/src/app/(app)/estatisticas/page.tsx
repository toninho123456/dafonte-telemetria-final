import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { visibleWhere } from "@/lib/scope";

type Row = { tractorId: string; km: number | null; engine_h: number | null; idle_h: number | null; max_speed: number | null; pts: number };
const n1 = (v: number | null) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export default async function Page({ searchParams }: { searchParams: { dias?: string } }) {
  const u = (await auth())!.user;
  if (u.role !== "PLATFORM_ADMIN" && !PERMS["telemetry:view"].includes(u.role)) notFound();
  const dias = [1, 7, 30, 90].includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 7;
  const tractors = await prisma.tractor.findMany({ where: visibleWhere(u), select: { id: true, name: true, hours: true }, orderBy: { name: "asc" } });
  const ids = tractors.map((t) => t.id), since = new Date(Date.now() - dias * 86_400_000);
  // Distância (haversine entre pontos seguidos) e tempos. Intervalos > 120 s (sem sinal) não entram na conta.
  const rows = ids.length ? await prisma.$queryRaw<Row[]>`
    WITH p AS (
      SELECT "tractorId", lat, lng, speed, "engineOn", "recordedAt",
        LAG(lat) OVER w AS plat, LAG(lng) OVER w AS plng, LAG("recordedAt") OVER w AS pt
      FROM "Telemetry" WHERE "tractorId" = ANY(${ids}::text[]) AND "recordedAt" >= ${since}
      WINDOW w AS (PARTITION BY "tractorId" ORDER BY "recordedAt")
    ), d AS (
      SELECT *, EXTRACT(EPOCH FROM ("recordedAt" - pt)) AS dt,
        12742 * ASIN(SQRT(POWER(SIN(RADIANS(lat - plat) / 2), 2) + COS(RADIANS(plat)) * COS(RADIANS(lat)) * POWER(SIN(RADIANS(lng - plng) / 2), 2))) AS km
      FROM p WHERE pt IS NOT NULL
    )
    SELECT "tractorId",
      SUM(CASE WHEN dt <= 120 THEN km ELSE 0 END)::float AS km,
      (SUM(CASE WHEN dt <= 120 AND "engineOn" THEN dt ELSE 0 END) / 3600)::float AS engine_h,
      (SUM(CASE WHEN dt <= 120 AND "engineOn" AND speed < 2 THEN dt ELSE 0 END) / 3600)::float AS idle_h,
      MAX(speed)::float AS max_speed, COUNT(*)::int AS pts
    FROM d GROUP BY "tractorId"` : [];
  const by = new Map(rows.map((r) => [r.tractorId, r]));
  const list = tractors.map((t) => ({ t, r: by.get(t.id) })).sort((a, b) => (b.r?.km ?? 0) - (a.r?.km ?? 0));
  const maxKm = Math.max(1, ...list.map((x) => x.r?.km ?? 0));
  const tot = rows.reduce((a, r) => ({ km: a.km + (r.km ?? 0), eng: a.eng + (r.engine_h ?? 0), idle: a.idle + (r.idle_h ?? 0) }), { km: 0, eng: 0, idle: 0 });
  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">Desempenho da frota</h1>
        <nav className="flex gap-2 text-sm">{[1, 7, 30, 90].map((d) => <Link key={d} href={`/estatisticas?dias=${d}`} className={`btn-o py-1 ${d === dias ? "border-[#f2b01e]" : ""}`}>{d === 1 ? "24 h" : `${d} dias`}</Link>)}</nav></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Distância", `${n1(tot.km)} km`], ["Motor ligado", `${n1(tot.eng)} h`], ["Parado c/ motor ligado", `${tot.eng ? Math.round((tot.idle / tot.eng) * 100) : 0}%`]].map(([k, v]) => <div key={k} className="rounded-lg border border-zinc-800 p-3"><div className="text-lg font-bold">{v}</div><small className="text-zinc-400">{k}</small></div>)}
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="text-zinc-400"><tr><th className="p-2">Trator</th><th>Distância</th><th>Motor ligado</th><th>Ocioso</th><th>Vel. máx.</th><th>Horímetro</th></tr></thead>
        <tbody>{list.map(({ t, r }) => (<tr key={t.id} className="border-t border-zinc-800">
          <td className="p-2"><Link href={`/tratores/${t.id}`} className="underline">{t.name}</Link></td>
          <td className="min-w-32"><div>{n1(r?.km ?? 0)} km</div><div className="h-1.5 rounded bg-zinc-800"><div className="h-1.5 rounded bg-[#f2b01e]" style={{ width: `${((r?.km ?? 0) / maxKm) * 100}%` }} /></div></td>
          <td>{n1(r?.engine_h ?? 0)} h</td><td>{r?.engine_h ? `${Math.round(((r.idle_h ?? 0) / r.engine_h) * 100)}%` : "—"}</td><td>{r ? `${n1(r.max_speed)} km/h` : "—"}</td><td>{n1(t.hours)} h</td></tr>))}</tbody></table>
        {!list.length && <p className="p-2 text-zinc-400">Nenhum trator disponível para você.</p>}</div>
      <p className="text-xs text-zinc-500">Calculado a partir dos pontos recebidos; períodos sem sinal por mais de 2 minutos não entram na conta. Ocioso = motor ligado com menos de 2 km/h.</p>
    </div>
  );
}
