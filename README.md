# Document Q&A

Demo de portfolio — sube un PDF o DOCX y hacele preguntas en lenguaje natural usando RAG.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Hono + Bun
- **Base de datos:** SQLite + Drizzle ORM
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Chat:** OpenAI `gpt-4o-mini`
- **Deploy:** Render (free tier)

## Setup local

```bash
# 1. Instalar dependencias
bun install

# 2. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env y agregar tu OPENAI_API_KEY

# 3. Correr migraciones
bun run db:migrate

# 4. Levantar en modo desarrollo
bun run dev
```

La app estará en `http://localhost:5173` (frontend) con proxy al backend en `:3000`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | Requerida — usada para embeddings y chat |
| `DATABASE_URL` | Path de SQLite (default: `./data/docqa.db`) |
| `MAX_FILE_SIZE_MB` | Límite de tamaño de archivo (default: `20`) |
| `MAX_PAGES` | Límite de páginas del documento (default: `200`) |

## Deploy en Render

1. Push este repo a GitHub
2. En [render.com](https://render.com) → New → Web Service → conectar el repo
3. Render detecta el `render.yaml` automáticamente
4. Agregar `OPENAI_API_KEY` en Environment → Add Secret
5. Deploy
