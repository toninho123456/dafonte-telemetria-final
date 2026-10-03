import { z } from "zod";
import { prisma } from "@/lib/db";
import { bus, type LivePoint } from "@/lib/bus";
import { keyMatches } from "@/lib/deviceKey";
import { fail, HttpError } from "@/lib/http";
import { evalFences } from "@/lib/geofence";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  deviceId: z.string().min(3).max(64),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(120).default(0), // km/h
  heading: z.number().min(0).max(360).optional(), // graus, 0 = norte
  engineOn: z.boolean(),
  rpm: z.number().int().min(0).max(10000).optional(),
  fuelPct: z.number().min(0).max(100).optional(), // nível do tanque (%)
  coolantC: z.number().min(-40).max(150).optional(), // temperatura do motor (°C)
  hours: z.number().min(0).max(1e6).optional(), // horímetro; só sobe, nunca volta
  timestamp: z.string().datetime({ offset: true }).optional(), // ISO 8601; sem ele usa a hora de chegada
});
const last = new Map<string, number>(); // limite simples: 1 envio por segundo por dispositivo

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 4096) throw new HttpError(413, "Corpo grande demais");
    let json: unknown;
    try { json = JSON.parse(raw) } catch { throw new HttpError(400, "JSON inválido") }
    const p = Body.safeParse(json);
    if (!p.success) throw new HttpError(400, "Dados inválidos");
    const d = p.data;

    const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const dev = await prisma.device.findUnique({ where: { deviceId: d.deviceId } });
    if (!dev || !keyMatches(key, dev.keyHash)) throw new HttpError(401, "Credenciais inválidas"); // mesma resposta para ID errado e chave errada

    const now = Date.now();
    if (now - (last.get(dev.id) ?? 0) < 900) throw new HttpError(429, "Muitas requisições");
    last.set(dev.id, now);
    if (last.size > 5000) last.clear();

    const at = d.timestamp ? new Date(d.timestamp) : new Date(now);
    if (at.getTime() > now + 5 * 60_000) throw new HttpError(400, "Horário no futuro");

    await prisma.device.update({ where: { id: dev.id }, data: { lastSeenAt: new Date(now) } });
    if (!dev.tractorId) throw new HttpError(409, "Dispositivo sem trator vinculado: dado descartado");
    if (d.lat === 0 && d.lng === 0) throw new HttpError(422, "Sem fix de GPS (0,0): dado descartado");

    const data = { lat: d.lat, lng: d.lng, speed: d.speed, heading: d.heading ?? null, engineOn: d.engineOn, rpm: d.rpm ?? null, fuelPct: d.fuelPct ?? null, coolantC: d.coolantC ?? null, recordedAt: at };
    await prisma.telemetry.create({ data: { ...data, tenantId: dev.tenantId, tractorId: dev.tractorId } });

    // Só atualiza o "estado atual" se este ponto for o mais novo (pacotes podem chegar fora de ordem).
    const cur = await prisma.tractorStatus.findUnique({ where: { tractorId: dev.tractorId } });
    if (!cur || at >= cur.recordedAt) {
      const receivedAt = new Date(now);
      await prisma.tractorStatus.upsert({ where: { tractorId: dev.tractorId }, create: { tractorId: dev.tractorId, ...data, receivedAt }, update: { ...data, receivedAt } });
      const live: LivePoint = { tenantId: dev.tenantId, tractorId: dev.tractorId, ...data, recordedAt: at.toISOString(), receivedAt: receivedAt.toISOString() };
      bus.emit("point", live);
      try { await evalFences(dev.tenantId, dev.tractorId, d.lat, d.lng) } catch (e) { console.error("geofence:", e) } // alerta nunca derruba a telemetria
    }
    if (d.hours != null) await prisma.tractor.updateMany({ where: { id: dev.tractorId, hours: { lt: d.hours } }, data: { hours: d.hours } });
    return Response.json({ ok: true });
  } catch (e) { return fail(e) }
}
