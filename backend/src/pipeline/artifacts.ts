import { buildSearchIndex } from "../nlp/index.js";
import type { ParsedEpub } from "../epub/parse.js";

export interface ArtifactFile {
  path: string;
  data: string | Uint8Array;
}

export const CONTENT_VERSION = 1;

export function storageKey(bookId: string, ...parts: string[]): string {
  return ["books", bookId, ...parts].join("/");
}

export function buildArtifacts(parsed: ParsedEpub): ArtifactFile[] {
  const { bookId } = parsed;
  const files: ArtifactFile[] = [];

  for (const chapter of parsed.chapters) {
    const chapterJson = {
      bookId,
      chapterIdx: chapter.idx,
      title: chapter.title,
      lang: chapter.lang,
      contentVersion: CONTENT_VERSION,
      blocks: chapter.blocks,
    };
    files.push({
      path: storageKey(bookId, "chapters", `${chapter.idx}.json`),
      data: JSON.stringify(chapterJson, null, 2),
    });
  }

  const manifest = {
    bookId,
    title: parsed.metadata.title,
    author: parsed.metadata.author,
    language: parsed.metadata.language,
    totalChapters: parsed.chapters.length,
    contentVersion: CONTENT_VERSION,
    coverKey: parsed.cover ? storageKey(bookId, "cover.jpg") : null,
    chapters: parsed.chapters.map((ch) => ({
      idx: ch.idx,
      title: ch.title,
      wordCount: ch.wordCount,
      key: storageKey(bookId, "chapters", `${ch.idx}.json`),
    })),
    a11y: { score: parsed.a11y.score, counts: parsed.a11y.counts },
  };
  files.push({
    path: storageKey(bookId, "manifest.json"),
    data: JSON.stringify(manifest, null, 2),
  });

  files.push({
    path: storageKey(bookId, "report.json"),
    data: JSON.stringify(
      {
        bookId,
        a11y: parsed.a11y,
        skipped: parsed.skipped,
      },
      null,
      2,
    ),
  });

  files.push({
    path: storageKey(bookId, "search-index.json"),
    data: JSON.stringify(buildSearchIndex(parsed.chapters)),
  });

  if (parsed.cover) {
    files.push({ path: storageKey(bookId, "cover.jpg"), data: parsed.cover.bytes });
  }

  return files;
}
