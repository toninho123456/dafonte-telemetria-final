// Roda antes de subir o servidor em produção: banco pronto + administrador criado. Pode rodar quantas vezes quiser.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
const run = (cmd) => { const r = spawnSync(cmd, { shell: true, stdio: "inherit" }); if (r.status !== 0) { console.error(`Falhou: ${cmd}`); process.exit(r.status ?? 1) } };
const hasMigrations = existsSync("prisma/migrations") && readdirSync("prisma/migrations").some((f) => !f.endsWith(".toml"));
run(hasMigrations ? "npx prisma migrate deploy" : "npx prisma db push"); // sem pasta de migrações, cria as tabelas direto do schema
if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) run("npx tsx prisma/seed.ts"); // cria a Dafonte e o administrador se ainda não existirem
