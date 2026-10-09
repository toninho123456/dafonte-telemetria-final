import Link from "next/link";
import { auth } from "@/auth";
import { PERMS } from "@/lib/perms";
import { statusOf, STATUS_LABEL, STATUS_COLOR } from "@/lib/status";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tractorFor } from "@/lib/tractors";
import TractorForm from "../TractorForm";
import { TractorIcon } from "../TractorIcon";
import { updateTractor, deleteTractor, uploadPhoto, removePhoto, setAccess, assignDevice } from "../actions";

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const u = (await auth())!.user;
  const t = await tractorFor(u, params.id);
  await audit(u, `visualizou o trator ${t.name}`, { tractorId: t.id });
  const st = statusOf(t.status), canMap = u.role === "PLATFORM_ADMIN" || PERMS["map:view"].includes(u.role);
  const isAdmin = u.role === "ADMIN", basic = u.role === "OPERADOR";
  let users: { id: string; name: string; role: string }[] = [], granted = new Set<string>(), free: { id: string; deviceId: string }[] = [];
  if (isAdmin) {
    users = await prisma.user.findMany({ where: { tenantId: u.tenantId!, role: { not: "ADMIN" }, status: "ACTIVE" }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } });
    granted = new Set((await prisma.tractorAccess.findMany({ where: { tractorId: t.id } })).map((a) => a.userId));
    free = await prisma.device.findMany({ where: { tenantId: u.tenantId!, tractorId: null }, select: { id: true, deviceId: true } });
  }
  const rows: [string, string][] = [["Marca", t.brand], ["Modelo", t.model], ["Ano", t.year?.toString() ?? "—"], ["Fazenda", t.farm ?? "—"], ["Operador", t.operator ?? "—"], ["Horímetro", `${t.hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`], ["Dispositivo", t.device?.deviceId ?? "não vinculado"], ...(basic ? [] : [["Série", t.serial ?? "—"], ["Observações", t.notes ?? "—"]] as [string, string][])];
  return (
    <div className="grid max-w-3xl gap-6">
      {searchParams.erro && <p role="alert" className="text-red-400">{searchParams.erro}</p>}
      <section className="flex flex-wrap gap-4">
        <div className="flex aspect-[16/10] w-full max-w-xs items-center justify-center overflow-hidden rounded-lg bg-zinc-900 text-zinc-600">
          {t.photoPath ? <img src={`/api/tractors/${t.id}/photo`} alt={t.name} className="h-full w-full object-cover" /> : <TractorIcon />}
        </div>
        <div className="flex-1"><h1 className="text-xl font-bold">{t.name}</h1>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">{rows.map(([k, v]) => <><dt key={k} className="text-zinc-400">{k}</dt><dd key={k + v}>{v}</dd></>)}</dl>
          <p className="mt-3 text-sm"><span style={{ color: STATUS_COLOR[st] }}>●</span> {STATUS_LABEL[st]}{t.status && ` · ${t.status.speed.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/h · último sinal ${t.status.receivedAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}`}{canMap && <> · <Link href="/mapa" className="underline">ver no mapa</Link></>}{(u.role === "PLATFORM_ADMIN" || PERMS["history:view"].includes(u.role)) && <> · <Link href={`/tratores/${t.id}/historico`} className="underline">ver percurso</Link></>}</p>
          {t.status && (t.status.rpm != null || t.status.fuelPct != null || t.status.coolantC != null) && <p className="mt-1 text-sm text-zinc-300">{t.status.rpm != null && `${t.status.rpm} rpm`}{t.status.fuelPct != null && ` · combustível ${Math.round(t.status.fuelPct)}%`}{t.status.coolantC != null && ` · motor ${Math.round(t.status.coolantC)} °C`}</p>}</div>
      </section>
      {isAdmin && (<>
        <section><h2 className="mb-2 font-bold">Foto</h2>
          <form action={uploadPhoto.bind(null, t.id)} className="flex flex-wrap gap-2"><input className="input max-w-xs" type="file" name="photo" accept="image/jpeg,image/png,image/webp" required /><button className="btn-o">{t.photoPath ? "Substituir foto" : "Enviar foto"}</button></form>
          {t.photoPath && <form action={removePhoto.bind(null, t.id)} className="mt-2"><button className="btn-o text-red-400">Excluir foto</button></form>}</section>
        <section><h2 className="mb-2 font-bold">Dispositivo de telemetria</h2>
          <form action={assignDevice.bind(null, t.id)} className="flex flex-wrap gap-2"><select className="input max-w-xs" name="deviceId" defaultValue={t.device?.id ?? ""}><option value="">Sem dispositivo</option>{t.device && <option value={t.device.id}>{t.device.deviceId} (atual)</option>}{free.map((d) => <option key={d.id} value={d.id}>{d.deviceId}</option>)}</select><button className="btn-o">Salvar vínculo</button></form></section>
        <section><h2 className="mb-2 font-bold">Quem pode ver este trator</h2>
          <form action={setAccess.bind(null, t.id)} className="grid gap-1 text-sm">{users.map((x) => <label key={x.id} className="flex gap-2"><input type="checkbox" name="userId" value={x.id} defaultChecked={granted.has(x.id)} />{x.name} <span className="text-zinc-500">({x.role})</span></label>)}{!users.length && <p className="text-zinc-400">Nenhum outro usuário na concessionária ainda.</p>}<button className="btn-o mt-2 w-fit">Salvar permissões</button></form></section>
        <section><h2 className="mb-2 font-bold">Editar dados</h2><TractorForm action={updateTractor.bind(null, t.id)} t={t} submit="SALVAR ALTERAÇÕES" /></section>
        <section><h2 className="mb-2 font-bold text-red-400">Excluir trator</h2>
          <form action={deleteTractor.bind(null, t.id)} className="flex flex-wrap items-center gap-3 text-sm"><label className="flex gap-2"><input type="checkbox" name="confirm" />Confirmo a exclusão (apaga também a foto)</label><button className="btn-o text-red-400">Excluir</button></form></section>
      </>)}
    </div>
  );
}
