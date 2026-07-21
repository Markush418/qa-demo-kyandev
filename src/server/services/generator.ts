import OpenAI from "openai";
import type { RetrievedChunk } from "./retriever";

const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const MAX_TOKENS = 2048;
const HISTORY_LIMIT = 6;

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

const SYSTEM_PROMPT = `Sos un asistente experto en análisis de documentos. Respondés preguntas basándote exclusivamente en el contenido del documento proporcionado.

Reglas de formato (siempre en Markdown):
- Usá **negrita** para destacar datos clave: cifras, nombres propios, conclusiones importantes.
- Organizá respuestas largas con encabezados (## o ###) y listas con viñetas o numeradas.
- Para comparaciones o múltiples opciones, usá una lista o tabla Markdown.
- Respuestas cortas y directas no necesitan encabezados — solo texto limpio con negrita donde corresponda.
- Si la información no está en el documento, respondé exactamente: "No encontré esa información en el documento."
- No inventes datos ni completes con conocimiento propio.`;

function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
}

export const NO_INFO_REPLY =
  "No encontré esa información en el documento. ¿Podés reformular la pregunta o consultar sobre otro tema del texto?";

export const MAX_FULL_CONTEXT_CHARS = 380_000;

export async function* generateAnswerStream(
  query: string,
  relevantChunks: RetrievedChunk[],
  history: HistoryMessage[]
): AsyncGenerator<string> {
  const context = buildContextBlock(relevantChunks);
  const stream = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: `Contexto:\n${context}\n\nUsuario: ${query}` },
    ],
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export async function* generateWithFullContextStream(
  query: string,
  fullText: string,
  history: HistoryMessage[]
): AsyncGenerator<string> {
  const stream = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: `Documento completo:\n${fullText}\n\nUsuario: ${query}` },
    ],
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
