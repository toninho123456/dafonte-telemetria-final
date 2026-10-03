// Simula um trator enviando telemetria (para testar sem hardware).
// Uso: npm run simular -- <ID_DO_DISPOSITIVO> <CHAVE> [URL]
const [deviceId, key, url = "http://localhost:3000"] = process.argv.slice(2);
if (!deviceId || !key) { console.error("Uso: npm run simular -- <ID_DO_DISPOSITIVO> <CHAVE> [URL]"); process.exit(1) }
let lat = -7.1239, lng = -34.9319, heading = 45, tick = 0; // perto de Bayeux-PB
setInterval(async () => {
  const phase = tick++ % 60; // 40 ticks andando, 10 parado com motor ligado, 10 desligado
  const engineOn = phase < 50, speed = phase < 40 ? 8 + Math.random() * 4 : 0;
  heading = (heading + (Math.random() - 0.5) * 20 + 360) % 360;
  const meters = (speed / 3.6) * 2, rad = (heading * Math.PI) / 180;
  lat += (meters * Math.cos(rad)) / 111_320; lng += (meters * Math.sin(rad)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  try {
    const r = await fetch(`${url}/api/telemetry`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ deviceId, lat, lng, speed, heading, engineOn, rpm: engineOn ? Math.round(1200 + speed * 80) : 0, fuelPct: Math.max(5, 80 - tick / 20), coolantC: engineOn ? 85 + Math.round(speed / 2) : 40, timestamp: new Date().toISOString() }) });
    console.log(r.status, engineOn ? (speed ? "andando" : "parado") : "desligado", lat.toFixed(5), lng.toFixed(5), r.ok ? "" : await r.text());
  } catch (e) { console.error("falha de rede:", (e as Error).message) }
}, 2000);
