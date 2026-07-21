import OpenAI from "openai";
import type { RetrievedChunk } from "./retriever";

const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const MAX_TOKENS = 1024;
const HISTORY_LIMIT = 5;

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateResult {
  reply: string;
  usedChunkIds: string[];
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `Sos un asistente que responde preguntas basándose exclusivamente
en el contexto proporcionado. Si la respuesta no está en el contexto,
decí que no encontrás esa información en el documento. Citá las secciones
relevantes cuando sea posible.`;

function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
}

export async function generateAnswer(
  query: string,
  relevantChunks: RetrievedChunk[],
  history: HistoryMessage[]
): Promise<GenerateResult> {
  const recentHistory = history.slice(-HISTORY_LIMIT);
  const context = buildContextBlock(relevantChunks);

  const userTurn = `Contexto:\n${context}\n\nUsuario: ${query}`;

  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userTurn },
    ],
  });

  const reply = response.choices[0]?.message?.content ?? "";

  return {
    reply,
    usedChunkIds: relevantChunks.map((c) => c.id),
  };
}

export const NO_INFO_REPLY =
  "No encontré esa información en el documento. ¿Podés reformular la pregunta o consultar sobre otro tema del texto?";
