const INVISIBLE = /[\u200B\u200C\u200D\uFEFF]/g;

export function normalizeTamil(text: string): string {
  return text.normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

const TOKEN_SPLIT = /[\s\p{P}\p{S}\u0964]+/u;

export function tokenize(text: string): string[] {
  const normalized = normalizeTamil(text);
  if (!normalized) return [];
  return normalized.split(TOKEN_SPLIT).filter((t) => t.length > 0);
}

const SENTENCE_MATCH = /[^.!?\u0964]+[.!?\u0964]*/g;

export function splitSentences(text: string): string[] {
  const normalized = normalizeTamil(text);
  if (!normalized) return [];
  return (normalized.match(SENTENCE_MATCH) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
