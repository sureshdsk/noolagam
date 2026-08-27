import { eq } from "drizzle-orm";
import type { OrmDb } from "../db/index.js";
import { books, chapters } from "../db/tables.js";
import type { ParsedEpub } from "../epub/parse.js";
import { storageKey } from "./artifacts.js";

export interface PublishResult {
  bookId: string;
  contentVersion: number;
  changed: boolean;
  totalChapters: number;
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
  db: OrmDb,
  bookId: string,
  summary: string,
): Promise<void> {
  await db.update(books).set({ summary }).where(eq(books.id, bookId));
}

export async function publishBook(
  db: OrmDb,
  parsed: ParsedEpub,
  manifestJson: string,
  previousManifest: string | null,
): Promise<PublishResult> {
  const { bookId } = parsed;
  const existing = await db
    .select({ contentVersion: books.contentVersion })
    .from(books)
    .where(eq(books.id, bookId))
    .get();
  const changed = manifestsDiffer(previousManifest, manifestJson);
  const contentVersion = existing
    ? changed
      ? existing.contentVersion + 1
      : existing.contentVersion
    : 1;
  const publishedAt = new Date().toISOString();

  const values = {
    id: bookId,
    title: parsed.metadata.title,
    author: parsed.metadata.author,
    summary: null as string | null,
    language: parsed.metadata.language,
    coverKey: parsed.cover ? storageKey(bookId, "cover.jpg") : null,
    manifestKey: storageKey(bookId, "manifest.json"),
    totalChapters: parsed.chapters.length,
    hasAudio: 0,
    a11yScore: parsed.a11y.score,
    contentVersion,
    status: "published",
    publishedAt,
  };
  const { id: _id, ...setValues } = values;
  void _id;
  await db
    .insert(books)
    .values(values)
    .onConflictDoUpdate({ target: books.id, set: setValues });

  await db.delete(chapters).where(eq(chapters.bookId, bookId));
  for (const ch of parsed.chapters) {
    await db.insert(chapters).values({
      id: `${bookId}:${ch.idx}`,
      bookId,
      idx: ch.idx,
      title: ch.title,
      wordCount: ch.wordCount,
      contentKey: storageKey(bookId, "chapters", `${ch.idx}.json`),
    });
  }

  return {
    bookId,
    contentVersion,
    changed,
    totalChapters: parsed.chapters.length,
  };
}
