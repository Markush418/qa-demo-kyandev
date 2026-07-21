FROM oven/bun:1-alpine

WORKDIR /app

# Instalar dependencias primero (cache-friendly)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copiar fuentes y buildear el cliente
COPY . .
RUN bun run build:client

# Crear directorio de datos
RUN mkdir -p data

EXPOSE 3000

ENV NODE_ENV=production

# Las migraciones corren en cada arranque (seguro en SQLite con IF NOT EXISTS)
CMD ["sh", "-c", "bun run db:migrate && bun run src/server/index.ts"]
