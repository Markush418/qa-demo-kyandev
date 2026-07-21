# Document Q&A

**Demo en vivo → [qa-demo-kyandev.onrender.com](https://qa-demo-kyandev.onrender.com)**

Subí un documento (PDF, DOCX o Markdown) y hacé preguntas en lenguaje natural. El sistema usa RAG adaptativo: decide automáticamente entre búsqueda semántica por chunks o lectura del documento completo según la naturaleza de la pregunta.

---

## Cómo funciona

```
Documento  ──▶  Extracción de texto  ──▶  Chunks (800 tokens, 100 overlap)
                                               │
                                               ▼
                                    Embeddings (text-embedding-3-small)
                                               │
                              ┌────────────────┴──────────────────┐
Usuario pregunta              │   Adaptive RAG Router             │
     │                        │                                    │
     ▼                        │  score ≥ 0.55  → RAG (top-10)    │
  Embedding                   │  score < 0.55  → Full-context     │
  de la query ────────────────│  doc > 380k chars → RAG fallback  │
                              └───────────────────────────────────┘
                                               │
                                               ▼
                                    gpt-4o-mini  ──▶  Respuesta
```

### Adaptive RAG

Cada consulta genera un embedding y se compara contra todos los chunks del documento. Si el chunk más similar supera el umbral de confianza (`0.55`), la pregunta es específica y el sistema usa solo los 10 chunks más relevantes (barato). Si la similitud es baja, la pregunta es estructural o global y se manda el documento completo al contexto del modelo (hasta ~95k tokens). El modo usado se devuelve en la API para que el frontend lo muestre.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Hono + Bun |
| Base de datos | SQLite + Drizzle ORM (WAL mode) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Chat | OpenAI `gpt-4o-mini` |
| Deploy | Render free tier (Docker) |

---

## Formatos soportados

- **PDF** — texto nativo (no escaneos)
- **DOCX** — Word vía mammoth
- **Markdown** — `.md` / `.markdown`, strips sintaxis antes de chunking

Límite: 20 MB · 200 páginas.

---

## Setup local

```bash
# 1. Instalar dependencias
bun install

# 2. Variables de entorno
cp .env.example .env
# Agregar OPENAI_API_KEY en .env

# 3. Migraciones
bun run db:migrate

# 4. Dev (frontend en :5173, backend en :3000)
bun run dev
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | — | Requerida |
| `DATABASE_URL` | `./data/docqa.db` | Path SQLite |
| `MAX_FILE_SIZE_MB` | `20` | Límite de tamaño |
| `MAX_PAGES` | `200` | Límite de páginas |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` | Modelo de embeddings |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | Modelo de chat |

---

## Deploy propio en Render

1. Fork este repo
2. En [render.com](https://render.com) → New → Web Service → conectar repo
3. Render detecta el `render.yaml` automáticamente (Docker, free plan)
4. Agregar `OPENAI_API_KEY` en Environment → Add Secret File
5. Deploy — las migraciones corren solas al arrancar el contenedor
