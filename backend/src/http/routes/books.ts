import { Hono } from "hono";
import { and, asc, desc, eq, or, sql, type SQL } from "drizzle-orm";
import type { OrmDb } from "../../db/index.js";
import { books, chapters } from "../../db/tables.js";
import type { Book, Chapter } from "../../db/tables.js";
import { badRequest, notFoundBook } from "../guards.js";

export interface BookListQuery {
  q?: string;
  category?: string;
  page?: string;
  limit?: string;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function likeEscape(column: SQL, pattern: string): SQL {
  return sql`(${column} like ${pattern} escape '\\')`;
}

function serializeBook(row: Book) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    summary: row.summary,
    language: row.language,
    total_chapters: row.totalChapters,
    has_audio: row.hasAudio === 1,
    a11y_score: row.a11yScore,
    content_version: row.contentVersion,
    published_at: row.publishedAt,
  };
}

function serializeChapter(row: Pick<Chapter, "idx" | "title" | "wordCount" | "audioKey" | "durationSecs">) {
  return {
    idx: row.idx,
    title: row.title,
    word_count: row.wordCount,
    audio_available: row.audioKey !== null,
    duration_secs: row.durationSecs,
  };
}

export function bookRoutes(db: () => OrmDb): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const query = c.req.query() as BookListQuery;
    const page = Math.max(1, Number(query.page ?? "1") || 1);
    const rawLimit = Number(query.limit ?? "20") || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(books.status, "published")];

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLike(query.q.trim())}%`;
      conditions.push(
        or(
          likeEscape(sql`${books.title}`, pattern),
          likeEscape(sql`${books.author}`, pattern),
        )!,
      );
    }
    if (query.category && /^\d+$/.test(query.category)) {
      conditions.push(
        sql`${books.id} in (select book_id from book_categories where category_id = ${Number(query.category)})`,
      );
    }
    const where = and(...conditions);

    const totalRow = await db()
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(books)
      .where(where)
      .get();
    const rows = await db()
      .select()
      .from(books)
      .where(where)
      .orderBy(desc(books.publishedAt), books.id)
      .limit(limit)
      .offset(offset);

    return c.json({
      items: rows.map(serializeBook),
      page,
      limit,
      total: totalRow?.total ?? 0,
    });
  });

  app.get("/:bookId", async (c) => {
    const bookId = c.req.param("bookId");
    const book = await db()
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book) return notFoundBook(c, bookId);

    const chapterRows = await db()
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.idx));

    return c.json({
      ...serializeBook(book),
      chapters: chapterRows.map(serializeChapter),
    });
  });

  app.get("/:bookId/chapters", async (c) => {
    const bookId = c.req.param("bookId");
    const book = await db()
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book) return notFoundBook(c, bookId);

    const chapterRows = await db()
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.idx));

    return c.json({ items: chapterRows.map(serializeChapter) });
  });

  app.notFound((c) => badRequest(c, "Unknown books route"));

  return app;
}
