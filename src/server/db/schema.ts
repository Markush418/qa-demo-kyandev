import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // "pdf" | "docx" | "md"
  pageCount: integer("page_count").notNull(),
  chunkCount: integer("chunk_count").notNull(),
  fullText: text("full_text"),            // texto completo para full-context mode
  createdAt: integer("created_at").notNull(),
});

export const chunks = sqliteTable("chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: text("embedding").notNull(), // JSON array de floats
  tokenCount: integer("token_count").notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  sources: text("sources"), // JSON array de chunk_ids (solo assistant)
  createdAt: integer("created_at").notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
