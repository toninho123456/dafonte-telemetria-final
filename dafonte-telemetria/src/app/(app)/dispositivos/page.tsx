import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import DeviceKey from "./DeviceKey";
import { createDevice, linkDevice, deleteDevice } from "../tratores/actions";

export default async function Page({ searchParams }: { searchParams: { erro?: string } }) {
  const u = (await auth())!.user;
  if (u.role !== "ADMIN") notFound();
  const [devices, freeTractors] = await Promise.all([
    prisma.device.findMany({ where: { tenantId: u.tenantId! }, include: { tractor: true }, orderBy: { deviceId: "asc" } }),
    prisma.tractor.findMany({ where: { tenantId: u.tenantId!, device: { is: null } }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="text-xl font-bold">Dispositivos de telemetria</h1>
      {searchParams.erro && <p role="alert" className="text-red-400">{searchParams.erro}</p>}
      <form action={createDevice} className="grid gap-2 sm:grid-cols-4">
        <input className="input" name="deviceId" placeholder="ID do dispositivo" required />
        <input className="input" name="imei" placeholder="IMEI (opcional)" inputMode="numeric" />
        <select className="input" name="tractorId" defaultValue=""><option value="">Sem trator</option>{freeTractors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <button className="btn">Cadastrar</button>
      </form>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="text-zinc-400"><tr><th className="p-2">ID</th><th>IMEI</th><th>Trator vinculado</th><th>Última comunicação</th><th>Ações</th></tr></thead>
        <tbody>{devices.map((d) => (
          <tr key={d.id} className="border-t border-zinc-800"><td className="p-2">{d.deviceId}</td><td>{d.imei ?? "—"}</td><td>{d.tractor?.name ?? "não vinculado"}</td><td className="text-zinc-500">{d.lastSeenAt ? d.lastSeenAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }) : "nenhuma ainda"}</td>
            <td><div className="flex flex-wrap gap-2">
              <form action={linkDevice.bind(null, d.id)} className="flex gap-1">
                {d.tractor ? <><input type="hidden" name="tractorId" value="" /><button className="btn-o py-1">Desvincular</button></> : <><select className="input py-1" name="tractorId" defaultValue=""><option value="">Escolher trator</option>{freeTractors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><button className="btn-o py-1">Vincular</button></>}
              </form>
              <DeviceKey id={d.id} hasKey={!!d.keyHash} />
              <form action={deleteDevice.bind(null, d.id)}><button className="btn-o py-1 text-red-400">Excluir</button></form></div></td></tr>))}
        </tbody></table>{!devices.length && <p className="p-2 text-zinc-400">Nenhum dispositivo cadastrado.</p>}</div>
    </div>
  );
}
