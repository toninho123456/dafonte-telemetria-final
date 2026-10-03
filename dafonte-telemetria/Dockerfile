FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
EXPOSE 3000
# prepara o banco, cria o administrador (se SEED_ADMIN_* existir) e sobe o servidor (Next + WebSocket)
CMD ["npm", "run", "start:deploy"]
