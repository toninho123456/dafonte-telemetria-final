# Dafonte Tratores – Monitoramento e Telemetria (Etapa 1)

Base multiconcessionária: cada concessionária é um *tenant* com seus usuários, logo e dados.

## Rodar
1. `cp .env.example .env` e preencha `AUTH_SECRET` (`npx auth secret`), `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
2. `docker compose up -d` (PostgreSQL local)
3. `npm install`
4. `npx prisma migrate dev --name init`
5. `npm run db:seed` (cria a Dafonte de Bayeux-PB com a logo e o administrador)
6. `npm run dev` → http://localhost:3000

## Google OAuth
Google Cloud Console → Credenciais → ID do cliente OAuth (Aplicativo da Web). URI de redirecionamento: `http://localhost:3000/api/auth/callback/google`. Coloque ID e segredo no `.env`. O Google só entra se o e-mail for verificado e já existir uma conta ativa.

## Regras de segurança desta etapa
- Senhas com bcrypt (custo 12); tokens de recuperação guardados só como hash SHA-256, válidos por 1 h.
- Sessão JWT de 8 h, relida no banco a cada requisição (bloquear usuário vale na hora).
- Permissões no servidor: `requireUser("acao")` e `tenantScope(user)` em toda rota/consulta.
- Concessionária nova nasce inativa. Para aprovar por enquanto: `npx prisma studio` → Tenant.active = true.

## Ainda não existe (próximas etapas)
Limite de tentativas de login (rate limit), envio real de e-mail (SMTP), convite de usuários, tela de aprovação da plataforma, foto de perfil, tratores, dispositivos, telemetria, mapa.

---
# Etapa 2 – Tratores, dispositivos e fotos
Depois de extrair por cima da etapa 1: `npm install` e `npx prisma migrate dev --name etapa2`.

- **Tratores** (`/tratores`): cadastro, edição, exclusão, busca e galeria com foto. Só o administrador altera.
- **Fotos**: ficam em `uploads/` (fora de `public`), validadas pelo conteúdo (JPG/PNG/WebP, até 5 MB) e servidas só por `/api/tractors/[id]/photo`, que confere login, concessionária e permissão. Em produção use volume persistente ou S3 (o disco da Vercel não persiste).
- **Dispositivos** (`/dispositivos`): ID e IMEI únicos no mundo; um dispositivo por trator e um trator por dispositivo (garantido pelo banco).
- **Permissões por trator**: na página do trator, o administrador marca quem pode ver. Sem permissão a pessoa recebe 404. Operador vê só informações básicas.
- **Auditoria**: visualizar, cadastrar, alterar e excluir já gravam em `AuditLog` (a tela de logs vem depois).

Ainda não: posição/status/velocidade reais (etapa 3), convite de usuários (por isso só o administrador existe até lá), telas de equipe e logs.

---
# Etapa 3 – Telemetria em tempo real e mapa
Depois de extrair por cima da etapa 2:
```
npm install
npx prisma migrate dev --name etapa3
npm run dev        # agora é um servidor próprio (server.ts): Next + WebSocket na mesma porta
```
Abra o sistema pelo mesmo endereço do `APP_URL` do `.env` (por padrão `http://localhost:3000`, não `127.0.0.1`): o WebSocket recusa conexões de outra origem.

## Testar sem hardware
1. Entre como administrador → **Dispositivos** → cadastre um dispositivo, vincule a um trator e clique em **Gerar chave** (ela aparece uma vez; copie).
2. Em outro terminal: `npm run simular -- <ID_DO_DISPOSITIVO> <CHAVE>`
3. Abra **Mapa**: o trator anda, para e desliga sozinho (ciclo de ~2 min). Entre como outro perfil para ver que cada pessoa só enxerga os tratores liberados.

## API para o dispositivo
`POST /api/telemetry` com `Authorization: Bearer <chave>` e corpo JSON:
```json
{"deviceId":"TRK-001","lat":-7.1239,"lng":-34.9319,"speed":8.5,"heading":90,"engineOn":true,"timestamp":"2026-10-02T15:04:05Z"}
```
`speed` em km/h (0–120), `heading` em graus (opcional), `timestamp` ISO 8601 (opcional). Respostas: `200` ok · `400` dados inválidos · `401` ID ou chave errados · `409` dispositivo sem trator (dado descartado) · `422` GPS sem fix (0,0) · `429` mais de 1 envio por segundo · `413` corpo > 4 KB.

## Regras desta etapa
- Chave por dispositivo: só o hash SHA-256 fica no banco; gerar nova chave invalida a anterior (fica no log de auditoria).
- Trator sem dispositivo não recebe dados; dispositivo sem trator tem os dados descartados.
- Pontos fora de ordem entram no histórico, mas só o mais novo atualiza o estado atual.
- Status: **Em movimento** (motor ligado e ≥ 2 km/h), **Ligado e parado**, **Desligado**, **Sem sinal** (nada recebido há 5 min).
- WebSocket (`/ws`): ingresso de 60 s e uso único (`/api/ws-ticket`), confere a origem, relê o usuário no banco e envia cada ponto só a quem tem permissão para aquele trator. A cada 15 s revalida; bloqueio ou permissão retirada vale em segundos. Máximo de 5 conexões por usuário.
- Mapa: Leaflet + OpenStreetMap (a atribuição aparece no canto do mapa, é obrigatória).

## Limites conhecidos (resolver antes de publicar)
- **Uma instância só**: o barramento de eventos é em memória. Com mais de um servidor, troque por Redis pub/sub.
- **Vercel não serve**: não mantém WebSocket nem processo próprio. Use VPS, Railway, Render ou Fly. Atrás de proxy (Nginx etc.), repasse os cabeçalhos `Upgrade`/`Connection` e use HTTPS (o navegador usa `wss`).
- A tabela `Telemetry` cresce a cada ponto; a política de retenção entra na etapa 4 (histórico).
- Os tiles públicos do OpenStreetMap são para uso leve; em produção com muito acesso, use um provedor de tiles.
- Ainda não existe: percurso, geofences e alertas (etapa 4), estatísticas (etapa 5).

---
# Etapas 4, 5 e 6
Depois de extrair por cima da etapa 3: `npm install`, `npx prisma migrate dev --name etapas456` e `npm run dev`.

## Etapa 4 – Percurso, áreas e alertas
- **Áreas** (menu *Áreas*): o administrador toca no mapa para marcar os cantos, dá um nome e salva. Gestor só visualiza.
- **Alertas**: quando um trator **entra ou sai** de uma área, o sistema grava o alerta, avisa na hora quem está com o mapa aberto (administrador e gestor) e conta no menu. A primeira leitura de um trator numa área só registra o estado, sem alerta. A área vale em até 10 s depois de criada.
- **Percurso**: página do trator → *ver percurso*, escolhe o dia (horário de Fortaleza). Mostra a linha no mapa, distância, tempo em movimento e velocidade máxima.
- **Retenção**: o servidor apaga pontos com mais de 90 dias, uma vez por dia.

## Etapa 5 – Desempenho, telemetria avançada, equipe, auditoria
- **Desempenho**: distância, motor ligado, % ocioso e velocidade máxima por trator (24 h, 7, 30 ou 90 dias). Buracos de sinal > 2 min não entram na conta.
- **Telemetria avançada** (campos opcionais no `POST /api/telemetry`): `rpm`, `fuelPct` (0–100), `coolantC` e `hours` (horímetro: só sobe). Aparecem na página do trator.
- **Equipe**: administrador cadastra pessoas (com senha inicial), troca cargo, bloqueia/desbloqueia e redefine senha. Não altera a própria conta. Depois, libere os tratores em *Tratores → Quem pode ver este trator*.
- **Auditoria**: últimas 300 ações, com quem, quando e IP.

## Etapa 6 – Acabamento e publicação
- **Dados da loja** (menu): nome, telefone, WhatsApp, e-mail e endereço aparecem no rodapé. Preencha com os dados reais da Dafonte.
- **Celular**: menu rolável, tabelas com rolagem, mapa e listas empilhadas; dá para “Adicionar à tela inicial”.
- **Segurança**: 5 senhas erradas por e-mail bloqueiam o login por 15 min; e-mail de recuperação de senha via SMTP (`SMTP_*` no `.env`).
- **Saúde**: `GET /api/health` responde 200 quando o banco está ok.

### Publicar (VPS com Docker)
1. Contrate um servidor Linux (VPS) e aponte um domínio (registro A) para o IP dele.
2. Instale Docker no servidor e copie o projeto, **incluindo a pasta `prisma/migrations`** (gerada pelo `migrate dev`).
3. Crie `.env.prod` com: `DOMAIN=seu-dominio.com.br`, `POSTGRES_PASSWORD=<senha forte>`, `AUTH_SECRET=<npx auth secret>`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SMTP_*` e, se usar, `AUTH_GOOGLE_ID/SECRET` (com a URI `https://seu-dominio.com.br/api/auth/callback/google`).
4. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
5. Primeira vez: `docker compose -f docker-compose.prod.yml --env-file .env.prod exec app npm run db:seed` (cria a Dafonte e o administrador).
6. Faça backup do volume do banco (`pg_dump`) e do volume `uploads`.

### Ainda não existe
Alerta de “sem sinal”, mais de uma instância do servidor (precisa de Redis), tela de aprovação de novas concessionárias pela plataforma (aprovar com `npx prisma studio` → Tenant.active).

---
# Colocar o site no ar (versão real)
O link `claude.ai/artifact` é só o protótipo visual. O site real precisa de um servidor próprio com **WebSocket** (não serve Vercel/Netlify). Dois caminhos:

## A) Render (mais fácil, sem mexer em servidor)
1. Crie um repositório no GitHub (privado) e envie esta pasta (inclua `prisma/migrations` se existir).
2. No Render: *New → Blueprint* → escolha o repositório (ele lê o `render.yaml`).
3. Preencha as variáveis pedidas: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (mín. 10, letra e número). Deixe `APP_URL` e `AUTH_URL` por último.
4. Quando o Render mostrar o endereço (`https://....onrender.com`), coloque-o em `APP_URL` e `AUTH_URL` e faça *Manual Deploy*. Para usar o domínio da loja, adicione-o em *Custom Domains* e use ele nessas duas variáveis.
5. Abra o endereço no celular ou no computador e entre com o administrador. Ao subir, o sistema cria as tabelas e o administrador sozinho.

## B) VPS com Docker
Veja “Publicar (VPS com Docker)” acima; `docker-compose.prod.yml` já traz banco, site e HTTPS automático.

## Depois de publicar
1. *Dados da loja*: preencha telefone, WhatsApp, e-mail e endereço reais.
2. *Dispositivos*: cadastre, vincule ao trator e gere a chave. Para os rastreadores reais, configure `POST https://SEU-ENDERECO/api/telemetry` (formato mais acima).
3. Sem rastreador, abra `https://SEU-ENDERECO/rastreador` num celular: ele envia o GPS do aparelho como se fosse o trator.
4. Google OAuth: no Google Cloud, adicione `https://SEU-ENDERECO/api/auth/callback/google` e preencha `AUTH_GOOGLE_ID/SECRET`.
5. Backups: ligue o backup automático do banco no painel do provedor.
