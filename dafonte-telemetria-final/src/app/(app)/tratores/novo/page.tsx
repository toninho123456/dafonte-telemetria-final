import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import TractorForm from "../TractorForm";
import { createTractor } from "../actions";

export default async function Page({ searchParams }: { searchParams: { erro?: string } }) {
  const u = (await auth())!.user;
  if (u.role !== "ADMIN") notFound();
  const devices = await prisma.device.findMany({ where: { tenantId: u.tenantId!, tractorId: null }, select: { id: true, deviceId: true }, orderBy: { deviceId: "asc" } });
  return (<div><h1 className="mb-3 text-xl font-bold">Cadastrar trator</h1>{searchParams.erro && <p role="alert" className="mb-3 text-red-400">{searchParams.erro}</p>}<TractorForm action={createTractor} devices={devices} submit="CADASTRAR" /></div>);
}
