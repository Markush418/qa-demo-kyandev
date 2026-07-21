import { Hono } from "hono";
import { db } from "../db";
import { documents, chunks, conversations } from "../db/schema";
import { desc, eq } from "drizzle-orm";

export const documentsRoute = new Hono();

documentsRoute.get("/", async (c) => {
  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
  return c.json({ documents: rows });
});

documentsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(conversations).where(eq(conversations.documentId, id));
  await db.delete(chunks).where(eq(chunks.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
  return c.json({ deleted: id });
});
