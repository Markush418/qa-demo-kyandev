import { estimateTokens } from "../utils/tokens";

const TARGET_TOKENS = 800;
const OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

export interface ChunkResult {
  chunks: string[];
  tokenCounts: number[];
}

// Divide un bloque de texto en unidades que respetan límites naturales
// (párrafo -> línea -> oración) sin nunca cortar a mitad de una oración.
function splitIntoUnits(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const bySeparator = (input: string, separator: string): string[] | null => {
    const parts = input.split(separator).filter((p) => p.length > 0);
    if (parts.length <= 1) return null;
    return parts.map((p, i) => (i < parts.length - 1 ? p + separator : p));
  };

  const paragraphs = bySeparator(text, "\n\n");
  const candidates = paragraphs ?? bySeparator(text, "\n") ?? bySeparator(text, ". ") ?? [text];

  const units: string[] = [];
  for (const candidate of candidates) {
    if (candidate.length > maxChars && candidate !== text) {
      units.push(...splitIntoUnits(candidate, maxChars));
    } else {
      units.push(candidate);
    }
  }
  return units;
}

function takeOverlapTail(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) return text;
  const tail = text.slice(-overlapChars);
  // Alinear el overlap al inicio de la oración más cercana para no cortar a mitad
  const sentenceStart = tail.indexOf(". ");
  return sentenceStart >= 0 ? tail.slice(sentenceStart + 2) : tail;
}

export function chunkText(text: string): ChunkResult {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return { chunks: [], tokenCounts: [] };
  }

  const units = splitIntoUnits(normalized, TARGET_CHARS);

  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    if (current.length > 0 && current.length + unit.length > TARGET_CHARS) {
      chunks.push(current.trim());
      const overlap = takeOverlapTail(current, OVERLAP_CHARS);
      current = overlap ? overlap + "\n\n" + unit : unit;
    } else {
      current += unit;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return {
    chunks,
    tokenCounts: chunks.map(estimateTokens),
  };
}
