import OpenAI from "openai";

const BATCH_SIZE = 20;
const MAX_CONCURRENT = 3;
const MODEL = "text-embedding-3-small";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function batch<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({
    model: MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

// Ejecuta las funciones con un máximo de `limit` en paralelo, preservando el orden de resultados
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const batches = batch(chunks, BATCH_SIZE);
  const tasks = batches.map((b) => () => embedBatch(b));
  const batchResults = await runWithConcurrency(tasks, MAX_CONCURRENT);

  return batchResults.flat();
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vector] = await embedBatch([query]);
  return vector;
}
