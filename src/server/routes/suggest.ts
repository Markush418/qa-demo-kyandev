import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "../db";
import { chunks as chunksTable } from "../db/schema";

export const suggestRoute = new Hono();

let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

suggestRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const documentId = body?.documentId;

  if (typeof documentId !== "string") {
    return c.json({ error: "Se requiere documentId" }, 400);
  }

  const rows = await db
    .select({ content: chunksTable.content })
    .from(chunksTable)
    .where(eq(chunksTable.documentId, documentId))
    .orderBy(asc(chunksTable.chunkIndex))
    .limit(4);

  if (rows.length === 0) return c.json({ questions: [] });

  const context = rows.map((r) => r.content).join("\n\n");

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Generá 4 preguntas útiles y específicas que alguien podría hacerle a este documento. Devolvé SOLO un objeto JSON con este formato: {"questions":["pregunta 1","pregunta 2","pregunta 3","pregunta 4"]}.',
        },
        {
          role: "user",
          content: `Inicio del documento:\n${context}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    const questions: string[] = Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, 4)
      : [];
    return c.json({ questions });
  } catch {
    return c.json({ questions: [] });
  }
});
