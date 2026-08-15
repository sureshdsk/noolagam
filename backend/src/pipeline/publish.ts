import type { Db } from "../db/types.js";
import type { ParsedEpub } from "../epub/parse.js";
import { storageKey } from "./artifacts.js";

export interface PublishResult {
  bookId: string;
  contentVersion: number;
  changed: boolean;
  totalChapters: number;
}

interface BookRow {
  content_version: number;
}

export function manifestKeyOf(bookId: string): string {
  return storageKey(bookId, "manifest.json");
}

export function manifestsDiffer(
  previous: string | null,
  next: string,
): boolean {
  if (previous === null) return true;
  return JSON.stringify(JSON.parse(previous)) !== JSON.stringify(JSON.parse(next));
}

export async function updateBookSummary(
  db: Db,
  bookId: string,
  summary: string,
): Promise<void> {
  await db.run("UPDATE books SET summary = ? WHERE id = ?", [summary, bookId]);
}

export async function publishBook(
  db: Db,
  parsed: ParsedEpub,
  manifestJson: string,
  previousManifest: string | null,
): Promise<PublishResult> {
  const { bookId } = parsed;
  const existing = await db.get<BookRow>("SELECT content_version FROM books WHERE id = ?", [
    bookId,
  ]);
  const changed = manifestsDiffer(previousManifest, manifestJson);
  const contentVersion = existing
    ? changed
      ? existing.content_version + 1
      : existing.content_version
    : 1;
  const publishedAt = new Date().toISOString();

  await db.run(
    `INSERT INTO books (id, title, author, summary, language, cover_key, manifest_key,
                        total_chapters, has_audio, a11y_score, content_version, status, published_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, 'published', ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       author = excluded.author,
       language = excluded.language,
       cover_key = excluded.cover_key,
       manifest_key = excluded.manifest_key,
       total_chapters = excluded.total_chapters,
       a11y_score = excluded.a11y_score,
       content_version = excluded.content_version,
       status = 'published',
       published_at = excluded.published_at`,
    [
      bookId,
      parsed.metadata.title,
      parsed.metadata.author,
      parsed.metadata.language,
      parsed.cover ? storageKey(bookId, "cover.jpg") : null,
      storageKey(bookId, "manifest.json"),
      parsed.chapters.length,
      parsed.a11y.score,
      contentVersion,
      publishedAt,
    ],
  );

  await db.run("DELETE FROM chapters WHERE book_id = ?", [bookId]);
  for (const ch of parsed.chapters) {
    await db.run(
      `INSERT INTO chapters (id, book_id, idx, title, word_count, content_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `${bookId}:${ch.idx}`,
        bookId,
        ch.idx,
        ch.title,
        ch.wordCount,
        storageKey(bookId, "chapters", `${ch.idx}.json`),
      ],
    );
  }

  return {
    bookId,
    contentVersion,
    changed,
    totalChapters: parsed.chapters.length,
  };
}
