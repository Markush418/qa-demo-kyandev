import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type FileType = "pdf" | "docx";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

export class ExtractionError extends Error {}

export async function extractText(buffer: Buffer, fileType: FileType): Promise<ExtractResult> {
  const result =
    fileType === "pdf" ? await extractPdf(buffer) : await extractDocx(buffer);

  if (!result.text || result.text.trim().length === 0) {
    throw new ExtractionError(
      fileType === "pdf"
        ? "Este PDF es una imagen escaneada, no tiene texto extraíble"
        : "El documento DOCX no tiene texto extraíble"
    );
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
  // DOCX no expone paginación real; se estima ~500 palabras por página
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));
  return { text, pageCount };
}
