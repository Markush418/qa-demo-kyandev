import { inArray, lt } from "drizzle-orm";
import { db } from "../db";
import { documents, chunks, conversations } from "../db/schema";

export async function cleanupExpiredDocuments(): Promise<void> {
  const hours = Number(process.env.CLEANUP_HOURS) || 24;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  const expired = await db
    .select({ id: documents.id })
    .from(documents)
    .where(lt(documents.createdAt, cutoff));

  if (expired.length === 0) return;

  const ids = expired.map((d) => d.id);

  // Orden: dependientes primero, luego la tabla padre
  await db.delete(conversations).where(inArray(conversations.documentId, ids));
  await db.delete(chunks).where(inArray(chunks.documentId, ids));
  await db.delete(documents).where(inArray(documents.id, ids));

  console.log(`[cleanup] ${ids.length} documento(s) eliminados (>${hours}h)`);
}
