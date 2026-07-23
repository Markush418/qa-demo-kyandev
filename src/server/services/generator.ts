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

const SYSTEM_PROMPT = `Sos un asistente de análisis de documentos. Tu única fuente de información es el documento que se te proporciona en cada mensaje.

REGLAS — NO NEGOCIABLES:
1. Respondé SOLO con información que esté textualmente en el documento.
2. NUNCA uses conocimiento externo, general, o de entrenamiento para completar una respuesta.
3. Si la pregunta no puede responderse con el documento, decí: "No encontré esa información en el documento."
4. Si tenés información parcial, respondé con lo que hay y aclará qué falta.

FORMATO (Markdown):
- **Negrita** para cifras, nombres clave y conclusiones importantes.
- Encabezados ## / ### para respuestas con múltiples secciones.
- Listas para enumeraciones; tablas para comparaciones.
- Respuestas cortas: sin encabezados, solo texto + negrita.`;

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
