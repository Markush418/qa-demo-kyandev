// Estimador simple de tokens (~4 caracteres por token en inglés/español promedio)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
