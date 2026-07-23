# Document Q&A

**Demo en vivo → [qa-demo-kyandev.onrender.com](https://qa-demo-kyandev.onrender.com)**

Subí cualquier documento y hacé preguntas en lenguaje natural. El sistema lee el documento completo y responde con precisión, sin inventar información.

---

## Qué puede hacer

**Leer y entender documentos**
- Sube un PDF, Word (.docx) o Markdown y el sistema lo indexa en segundos
- Soporta documentos de hasta 200 páginas y 20 MB
- Extrae texto de PDFs nativos y archivos Word sin perder estructura

**Responder preguntas con precisión**
- Responde basándose exclusivamente en el contenido del documento — nunca inventa
- Si la información no está en el documento, lo dice explícitamente
- Mantiene el hilo de la conversación: recordá preguntas anteriores dentro de la misma sesión

**Sugerir preguntas automáticamente**
- Al cargar el documento, genera 4 preguntas relevantes para empezar la exploración
- Las preguntas se adaptan al contenido específico de cada documento

**Streaming en tiempo real**
- Las respuestas aparecen palabra por palabra mientras el modelo las genera
- Sin esperar a que termine toda la respuesta para empezar a leer

**Respuestas formateadas**
- Usa Markdown: negritas para datos clave, listas para enumeraciones, tablas para comparaciones
- El formato se adapta automáticamente al tipo de pregunta

---

## Cómo funciona

```
PDF / DOCX / MD
      │
      ▼
  Extracción
  de texto
      │
      ▼
  Chunks de 800 tokens        Embeddings vectoriales
  con 100 de overlap    ────▶ (text-embedding-3-small)
                               guardados en SQLite
      
─────────────────────────────────────────────────────

Usuario hace una pregunta
      │
      ▼
  ¿Documento entra en       SÍ (< 380k chars)
  la ventana de contexto? ────────────────────▶  Manda documento
      │                                           completo al modelo
      │ NO (doc muy grande)
      ▼
  Genera embedding
  de la pregunta
      │
      ▼
  Busca los 10 chunks        score ≥ 0.55 → RAG (chunks relevantes)
  más similares         ───▶ score < 0.55 → RAG fallback
  (cosine similarity)

      │
      ▼
  gpt-4o-mini
      │
      ▼
  Respuesta en streaming  ──▶  Guardada en historial
```

**Decisión de modo:**
- La mayoría de documentos (PDFs de hasta ~150 páginas) entran en la ventana de contexto de 128k tokens de `gpt-4o-mini`. El sistema los manda completos — cero alucinaciones.
- Solo para documentos muy grandes que no entran, activa búsqueda semántica por chunks (RAG).

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Hono + Bun |
| Base de datos | SQLite + Drizzle ORM (WAL mode) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Chat | OpenAI `gpt-4o-mini` (128k context) |
| Deploy | Render free tier · Docker (`oven/bun:1-alpine`) |

---

## Características de producción

- **Rate limiting por IP** — 5 uploads/10 min · 30 mensajes/min (protege la API key)
- **Limpieza automática** — documentos eliminados después de 24h configurable (`CLEANUP_HOURS`)
- **Migraciones automáticas** — corren al arrancar el contenedor, sin intervención manual
- **Error handling** — respuestas JSON estructuradas en todos los endpoints

---

## Formatos soportados

| Formato | Extracción |
|---|---|
| PDF | Texto nativo · no soporta escaneos sin OCR |
| DOCX | Word vía mammoth · preserva párrafos |
| Markdown | `.md` / `.markdown` · limpia sintaxis antes de indexar |

---

## Setup local

```bash
# 1. Instalar dependencias
bun install

# 2. Variables de entorno
cp .env.example .env
# Agregar OPENAI_API_KEY en .env

# 3. Migraciones de base de datos
bun run db:migrate

# 4. Levantar en modo desarrollo
bun run dev
# Frontend en http://localhost:5173
# Backend en http://localhost:3000
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | — | Requerida |
| `DATABASE_URL` | `./data/docqa.db` | Path de SQLite |
| `MAX_FILE_SIZE_MB` | `20` | Límite de tamaño de archivo |
| `MAX_PAGES` | `200` | Límite de páginas del documento |
| `CLEANUP_HOURS` | `24` | Horas hasta eliminar documentos viejos |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` | Modelo de embeddings |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | Modelo de chat |

---

## Deploy propio en Render

1. Fork este repo en GitHub
2. En [render.com](https://render.com) → New → Web Service → conectar repo
3. Render detecta `render.yaml` automáticamente (Docker, free plan)
4. Agregar `OPENAI_API_KEY` en Environment → Add Secret
5. Deploy — las migraciones y el servidor arrancan solos
