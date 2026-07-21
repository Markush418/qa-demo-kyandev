import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type FileType = "pdf" | "docx" | "md";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

export class ExtractionError extends Error {}

export async function extractText(buffer: Buffer, fileType: FileType): Promise<ExtractResult> {
  let result: ExtractResult;
  if (fileType === "pdf") result = await extractPdf(buffer);
  else if (fileType === "docx") result = await extractDocx(buffer);
  else result = extractMarkdown(buffer);

  if (!result.text || result.text.trim().length === 0) {
    const labels: Record<FileType, string> = {
      pdf: "Este PDF es una imagen escaneada, no tiene texto extraíble",
      docx: "El documento DOCX no tiene texto extraíble",
      md: "El archivo Markdown no tiene contenido extraíble",
    };
    throw new ExtractionError(labels[fileType]);
  }

  return result;
}

async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const { value: text } = await mammoth.extractRawText({ buffer });
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));
  return { text, pageCount };
}

function extractMarkdown(buffer: Buffer): ExtractResult {
  const raw = buffer.toString("utf-8");
  const text = raw
    .replace(/^#{1,6}\s+/gm, "")                  // headings
    .replace(/\*\*\*(.+?)\*\*\*/gs, "$1")          // bold+italic
    .replace(/\*\*(.+?)\*\*/gs, "$1")              // bold
    .replace(/\*(.+?)\*/gs, "$1")                  // italic
    .replace(/___(.+?)___/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/_(.+?)_/gs, "$1")
    .replace(/~~(.+?)~~/gs, "$1")                  // strikethrough
    .replace(/```[\s\S]*?```/g, "")                // fenced code blocks
    .replace(/`(.+?)`/g, "$1")                     // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")               // images
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")            // links → keep text
    .replace(/^[-*_]{3,}\s*$/gm, "")               // horizontal rules
    .replace(/^\s*[-*+]\s+/gm, "")                 // unordered list bullets
    .replace(/^\s*\d+\.\s+/gm, "")                 // ordered list numbers
    .replace(/^\s*>\s*/gm, "")                     // blockquotes
    .replace(/\|/g, " ")                            // table pipes
    .replace(/^[-:| ]+$/gm, "")                    // table separators
    .replace(/<[^>]+>/g, "")                       // HTML tags
    .replace(/\n{3,}/g, "\n\n")                    // collapse blank lines
    .trim();

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));
  return { text, pageCount };
}
