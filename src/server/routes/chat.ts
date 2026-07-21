import { Hono } from "hono";
import { nanoid } from "nanoid";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { documents, conversations } from "../db/schema";
import { retrieveRelevantChunks } from "../services/retriever";
import {
  generateAnswer,
  generateWithFullContext,
  NO_INFO_REPLY,
  MAX_FULL_CONTEXT_CHARS,
  type HistoryMessage,
} from "../services/generator";

export const chatRoute = new Hono();

chatRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const documentId = body?.documentId;
  const message = body?.message;

  if (typeof documentId !== "string" || typeof message !== "string" || !message.trim()) {
    return c.json({ error: "Se requiere 'documentId' y 'message'." }, 400);
  }

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) {
    return c.json({ error: "Documento no encontrado." }, 404);
  }

  const priorMessages = await db
    .select()
    .from(conversations)
    .where(eq(conversations.documentId, documentId))
    .orderBy(asc(conversations.createdAt));

  const history: HistoryMessage[] = priorMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const now = Date.now();
  await db.insert(conversations).values({
    id: nanoid(),
    documentId,
    role: "user",
    content: message,
    sources: null,
    createdAt: now,
  });

  let reply: string;
  let sources: Array<{ chunkIndex: number; content: string; score: number }>;
  let usedChunkIds: string[] = [];

  const useFullContext =
    doc.fullText && doc.fullText.length <= MAX_FULL_CONTEXT_CHARS;

  if (useFullContext) {
    // Full-context: manda todo el documento, sin llamada a embeddings
    const result = await generateWithFullContext(message, doc.fullText!, history);
    reply = result.reply;
    sources = [];
  } else {
    // RAG: busca chunks relevantes por similitud semántica
    const retrieval = await retrieveRelevantChunks(message, documentId);
    if (retrieval.belowThreshold) {
      reply = NO_INFO_REPLY;
      sources = [];
    } else {
      const result = await generateAnswer(message, retrieval.chunks, history);
      reply = result.reply;
      usedChunkIds = retrieval.chunks.map((ch) => ch.id);
      sources = retrieval.chunks.map((ch) => ({
        chunkIndex: ch.chunkIndex,
        content: ch.content,
        score: ch.score,
      }));
    }
  }

  await db.insert(conversations).values({
    id: nanoid(),
    documentId,
    role: "assistant",
    content: reply,
    sources: usedChunkIds.length > 0 ? JSON.stringify(usedChunkIds) : null,
    createdAt: Date.now(),
  });

  return c.json({ reply, sources });
});
