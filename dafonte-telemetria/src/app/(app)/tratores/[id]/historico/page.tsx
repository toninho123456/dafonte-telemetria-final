import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PERMS } from "@/lib/perms";
import { tractorFor } from "@/lib/tractors";
import { km, type LL } from "@/lib/geo";
import RouteMap from "./RouteMap";

const today = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // dia em Fortaleza (UTC-3)
export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: { dia?: string } }) {
  const u = (await auth())!.user;
  if (u.role !== "PLATFORM_ADMIN" && !PERMS["history:view"].includes(u.role)) notFound();
  const t = await tractorFor(u, params.id);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") ? searchParams.dia! : today();
  const start = new Date(`${dia}T00:00:00-03:00`);
  if (isNaN(start.getTime())) notFound();
  const rows = await prisma.telemetry.findMany({ where: { tractorId: t.id, recordedAt: { gte: start, lt: new Date(start.getTime() + 86_400_000) } }, orderBy: { recordedAt: "asc" }, select: { lat: true, lng: true, speed: true, recordedAt: true }, take: 50_000 });
  let dist = 0, movingS = 0, max = 0;
  for (let i = 1; i < rows.length; i++) {
    const dt = (rows[i].recordedAt.getTime() - rows[i - 1].recordedAt.getTime()) / 1000;
    if (dt > 120) continue; // buraco de sinal: não conta
    dist += km([rows[i - 1].lat, rows[i - 1].lng], [rows[i].lat, rows[i].lng]);
    if (rows[i].speed >= 2) movingS += dt;
  }
  for (const r of rows) max = Math.max(max, r.speed);
  const step = Math.ceil(rows.length / 3000); // no máximo ~3000 pontos desenhados
  const line = rows.filter((_, i) => i % step === 0 || i === rows.length - 1).map((r) => [r.lat, r.lng] as LL);
  const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3"><Link href={`/tratores/${t.id}`} className="underline">← {t.name}</Link><h1 className="text-xl font-bold">Percurso</h1>
        <form className="flex gap-2"><input className="input" type="date" name="dia" defaultValue={dia} max={today()} /><button className="btn-o py-1">Ver</button></form></div>
      {rows.length ? <p className="text-sm text-zinc-300">{dist.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {(movingS / 3600).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h em movimento · máx. {max.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km/h · {fmt(rows[0].recordedAt)} às {fmt(rows[rows.length - 1].recordedAt)}</p>
        : <p className="text-zinc-400">Sem dados neste dia. O histórico guarda 90 dias.</p>}
      <RouteMap line={line} />
    </div>
  );
}
