import { Hono } from "hono";
import { nanoid } from "nanoid";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { documents, conversations } from "../db/schema";
import { retrieveRelevantChunks } from "../services/retriever";
import { generateAnswer, NO_INFO_REPLY, type HistoryMessage } from "../services/generator";

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

  const retrieval = await retrieveRelevantChunks(message, documentId);

  let reply: string;
  let sources: Array<{ chunkIndex: number; content: string; score: number }>;

  if (retrieval.belowThreshold) {
    reply = NO_INFO_REPLY;
    sources = [];
  } else {
    const result = await generateAnswer(message, retrieval.chunks, history);
    reply = result.reply;
    sources = retrieval.chunks.map((ch) => ({
      chunkIndex: ch.chunkIndex,
      content: ch.content,
      score: ch.score,
    }));
  }

  await db.insert(conversations).values({
    id: nanoid(),
    documentId,
    role: "assistant",
    content: reply,
    sources: JSON.stringify(retrieval.chunks.map((ch) => ch.id)),
    createdAt: Date.now(),
  });

  return c.json({ reply, sources });
});
