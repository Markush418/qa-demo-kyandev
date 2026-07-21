import { eq } from "drizzle-orm";
import { db } from "../db";
import { chunks as chunksTable } from "../db/schema";
import { cosineSimilarity } from "../utils/cosine";
import { embedQuery } from "./embedder";

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.3;

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  belowThreshold: boolean;
}

export async function retrieveRelevantChunks(
  query: string,
  documentId: string
): Promise<RetrievalResult> {
  const queryEmbedding = await embedQuery(query);

  const rows = await db
    .select()
    .from(chunksTable)
    .where(eq(chunksTable.documentId, documentId));

  const scored = rows.map((row) => ({
    id: row.id,
    content: row.content,
    chunkIndex: row.chunkIndex,
    score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding)),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, TOP_K);

  const belowThreshold = top.length === 0 || top[0].score < SIMILARITY_THRESHOLD;

  return { chunks: top, belowThreshold };
}
