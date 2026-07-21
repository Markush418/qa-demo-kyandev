import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db";
import { documents, chunks as chunksTable } from "../db/schema";
import { extractText, ExtractionError, type FileType } from "../services/extractor";
import { chunkText } from "../services/chunker";
import { embedChunks } from "../services/embedder";

export const uploadRoute = new Hono();

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 20;
const MAX_PAGES = Number(process.env.MAX_PAGES) || 200;

function resolveFileType(filename: string, mimeType: string): FileType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (ext === "md" || ext === "markdown") return "md";
  return null;
}

uploadRoute.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "Falta el archivo. Enviá multipart/form-data con campo 'file'." }, 400);
  }

  const fileType = resolveFileType(file.name, file.type);
  if (!fileType) {
    return c.json({ error: "Formato no soportado. Solo se aceptan archivos PDF, DOCX o Markdown (.md)." }, 400);
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return c.json(
      { error: `El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB.` },
      400
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted;
  try {
    extracted = await extractText(buffer, fileType);
  } catch (err) {
    if (err instanceof ExtractionError) {
      return c.json({ error: err.message }, 422);
    }
    throw err;
  }

  if (extracted.pageCount > MAX_PAGES) {
    return c.json(
      { error: `El documento tiene ${extracted.pageCount} páginas, el límite es ${MAX_PAGES}.` },
      400
    );
  }

  const { chunks, tokenCounts } = chunkText(extracted.text);
  if (chunks.length === 0) {
    return c.json({ error: "No se pudo extraer contenido útil del documento." }, 422);
  }

  const embeddings = await embedChunks(chunks);

  const documentId = nanoid();
  const now = Date.now();

  await db.insert(documents).values({
    id: documentId,
    filename: file.name,
    fileType,
    pageCount: extracted.pageCount,
    chunkCount: chunks.length,
    fullText: extracted.text,
    createdAt: now,
  });

  await db.insert(chunksTable).values(
    chunks.map((content, i) => ({
      id: nanoid(),
      documentId,
      content,
      chunkIndex: i,
      embedding: JSON.stringify(embeddings[i]),
      tokenCount: tokenCounts[i],
    }))
  );

  return c.json({
    documentId,
    filename: file.name,
    pageCount: extracted.pageCount,
    chunkCount: chunks.length,
  });
});
