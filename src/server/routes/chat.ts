import { Hono } from "hono";
import { nanoid } from "nanoid";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { documents, conversations } from "../db/schema";
import { retrieveRelevantChunks } from "../services/retriever";
import {
  generateAnswerStream,
  generateWithFullContextStream,
  NO_INFO_REPLY,
  MAX_FULL_CONTEXT_CHARS,
  type HistoryMessage,
} from "../services/generator";

export const chatRoute = new Hono();

const HIGH_CONFIDENCE_THRESHOLD = 0.55;
const enc = new TextEncoder();

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

  await db.insert(conversations).values({
    id: nanoid(),
    documentId,
    role: "user",
    content: message,
    sources: null,
    createdAt: Date.now(),
  });

  const retrieval = await retrieveRelevantChunks(message, documentId);
  const bestScore = retrieval.chunks[0]?.score ?? 0;

  let mode: "rag" | "full-context" | "rag-fallback";
  let sources: Array<{ chunkIndex: number; content: string; score: number }> = [];
  let usedChunkIds: string[] = [];
  let tokenGen: AsyncGenerator<string> | null = null;
  let staticReply: string | null = null;

  if (bestScore >= HIGH_CONFIDENCE_THRESHOLD) {
    mode = "rag";
    sources = retrieval.chunks.map((ch) => ({ chunkIndex: ch.chunkIndex, content: ch.content, score: ch.score }));
    usedChunkIds = retrieval.chunks.map((ch) => ch.id);
    tokenGen = generateAnswerStream(message, retrieval.chunks, history);
  } else if (doc.fullText && doc.fullText.length <= MAX_FULL_CONTEXT_CHARS) {
    mode = "full-context";
    tokenGen = generateWithFullContextStream(message, doc.fullText, history);
  } else {
    mode = "rag-fallback";
    if (retrieval.belowThreshold) {
      staticReply = NO_INFO_REPLY;
    } else {
      sources = retrieval.chunks.map((ch) => ({ chunkIndex: ch.chunkIndex, content: ch.content, score: ch.score }));
      usedChunkIds = retrieval.chunks.map((ch) => ch.id);
      tokenGen = generateAnswerStream(message, retrieval.chunks, history);
    }
  }

  // SSE (text/event-stream): nginx tiene soporte nativo y desactiva buffering automáticamente.
  // Más confiable que X-Accel-Buffering para proxies y CDNs intermedios.
  const responseStream = new ReadableStream({
    async start(controller) {
      const write = (obj: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        write({ type: "meta", mode, sources });

        let fullReply = "";

        if (staticReply) {
          write({ type: "token", content: staticReply });
          fullReply = staticReply;
        } else if (tokenGen) {
          for await (const token of tokenGen) {
            fullReply += token;
            write({ type: "token", content: token });
          }
        }

        await db.insert(conversations).values({
          id: nanoid(),
          documentId,
          role: "assistant",
          content: fullReply,
          sources: usedChunkIds.length > 0 ? JSON.stringify(usedChunkIds) : null,
          createdAt: Date.now(),
        });

        write({ type: "done" });
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
