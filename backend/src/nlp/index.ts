import type { ChapterDoc } from "../epub/blocks.js";
import { tokenize } from "./tamil.js";

export interface SearchHit {
  c: number;
  s: number;
  t: string;
}

export type SearchIndex = Record<string, SearchHit[]>;

export function buildSearchIndex(
  chapters: ChapterDoc[],
  opts: { minTokenLength?: number } = {},
): SearchIndex {
  const minLen = opts.minTokenLength ?? 2;
  const index: SearchIndex = {};
  for (const chapter of chapters) {
    chapter.sentences.forEach((sentence, s) => {
      for (const token of tokenize(sentence)) {
        if (token.length < minLen) continue;
        const hits = (index[token] ??= []);
        hits.push({ c: chapter.idx, s, t: sentence });
      }
    });
  }
  return index;
}

export function searchIndexLookup(
  index: SearchIndex,
  word: string,
): SearchHit[] {
  return index[normalizeKey(word)] ?? [];
}

function normalizeKey(word: string): string {
  return word.trim();
}
