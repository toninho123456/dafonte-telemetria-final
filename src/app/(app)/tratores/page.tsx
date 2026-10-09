import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { visibleWhere } from "@/lib/tractors";

   import { TractorIcon } from "./TractorIcon";

export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  const u = (await auth())!.user, q = searchParams.q?.trim();
  const c = (f: string) => ({ [f]: { contains: q, mode: "insensitive" } });
  const where: Prisma.TractorWhereInput = { ...visibleWhere(u), ...(q ? { OR: [c("name"), c("brand"), c("model"), c("serial"), c("farm"), { device: { deviceId: { contains: q, mode: "insensitive" } } }] as Prisma.TractorWhereInput[] } : {}) };
  const list = await prisma.tractor.findMany({ where, include: { device: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <form className="flex-1"><input className="input" name="q" defaultValue={q} placeholder="Pesquisar por nome, marca, modelo, série, fazenda ou dispositivo" /></form>
        {u.role === "ADMIN" && <Link className="btn" href="/tratores/novo">+ Cadastrar trator</Link>}
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {list.map((t) => (
          <Link key={t.id} href={`/tratores/${t.id}`} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 hover:border-[#f2b01e]">
            <div className="flex aspect-[16/10] items-center justify-center bg-zinc-900 text-zinc-600">
              {t.photoPath ? <img src={`/api/tractors/${t.id}/photo`} alt={t.name} className="h-full w-full object-cover" /> : <TractorIcon />}
            </div>
            <div className="p-3 text-sm">
              <b className="block text-base">{t.brand} {t.model}</b>
              <span className="text-zinc-400">{t.name}</span>
              <p className="mt-2 text-zinc-400">Dispositivo: {t.device?.deviceId ?? "não vinculado"}</p>
              <p className="text-zinc-400">Horímetro: {t.hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h</p>
              <p className="text-zinc-500">Posição e status: aguardando telemetria</p>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <p className="text-zinc-400">{q ? "Nenhum trator encontrado." : u.role === "ADMIN" ? "Nenhum trator cadastrado ainda." : "Você ainda não tem tratores autorizados. Peça ao administrador."}</p>}
    </div>
  );
}
