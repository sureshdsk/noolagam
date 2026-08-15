import { Hono } from "hono";
import type { Db } from "../../db/types.js";
import { badRequest, notFoundBook } from "../guards.js";

export interface BookRow {
  id: string;
  title: string;
  author: string | null;
  summary: string | null;
  language: string;
  total_chapters: number;
  has_audio: number;
  a11y_score: number | null;
  content_version: number;
  status: string;
  published_at: string | null;
}

export interface ChapterRow {
  idx: number;
  title: string;
  word_count: number;
  audio_key: string | null;
  duration_secs: number | null;
}

interface BookListQuery {
  q?: string;
  category?: string;
  page?: string;
  limit?: string;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function serializeBook(row: BookRow) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    summary: row.summary,
    language: row.language,
    total_chapters: row.total_chapters,
    has_audio: row.has_audio === 1,
    a11y_score: row.a11y_score,
    content_version: row.content_version,
    published_at: row.published_at,
  };
}

export function bookRoutes(db: () => Db): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const query = c.req.query() as BookListQuery;
    const page = Math.max(1, Number(query.page ?? "1") || 1);
    const rawLimit = Number(query.limit ?? "20") || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (query.q && query.q.trim().length > 0) {
      conditions.push("(title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\')");
      const pattern = `%${escapeLike(query.q.trim())}%`;
      params.push(pattern, pattern);
    }
    if (query.category && /^\d+$/.test(query.category)) {
      conditions.push("id IN (SELECT book_id FROM book_categories WHERE category_id = ?)");
      params.push(Number(query.category));
    }

    const where = conditions.join(" AND ");
    const totalRow = await db().get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM books WHERE ${where}`,
      params,
    );
    const rows = await db().all<BookRow>(
      `SELECT id, title, author, summary, language, total_chapters, has_audio,
              a11y_score, content_version, status, published_at
       FROM books WHERE ${where} ORDER BY published_at DESC, id LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return c.json({
      items: rows.map(serializeBook),
      page,
      limit,
      total: totalRow?.total ?? 0,
    });
  });

  app.get("/:bookId", async (c) => {
    const bookId = c.req.param("bookId");
    const book = await db().get<BookRow>(
      `SELECT id, title, author, summary, language, total_chapters, has_audio,
              a11y_score, content_version, status, published_at
       FROM books WHERE id = ? AND status = 'published'`,
      [bookId],
    );
    if (!book) return notFoundBook(c, bookId);

    const chapters = await db().all<ChapterRow>(
      "SELECT idx, title, word_count, audio_key, duration_secs FROM chapters WHERE book_id = ? ORDER BY idx",
      [bookId],
    );

    return c.json({
      ...serializeBook(book),
      chapters: chapters.map((ch) => ({
        idx: ch.idx,
        title: ch.title,
        word_count: ch.word_count,
        audio_available: ch.audio_key !== null,
        duration_secs: ch.duration_secs,
      })),
    });
  });

  app.get("/:bookId/chapters", async (c) => {
    const bookId = c.req.param("bookId");
    const book = await db().get<{ id: string }>(
      "SELECT id FROM books WHERE id = ? AND status = 'published'",
      [bookId],
    );
    if (!book) return notFoundBook(c, bookId);

    const chapters = await db().all<ChapterRow>(
      "SELECT idx, title, word_count, audio_key, duration_secs FROM chapters WHERE book_id = ? ORDER BY idx",
      [bookId],
    );
    return c.json({
      items: chapters.map((ch) => ({
        idx: ch.idx,
        title: ch.title,
        word_count: ch.word_count,
        audio_available: ch.audio_key !== null,
        duration_secs: ch.duration_secs,
      })),
    });
  });

  app.notFound((c) => badRequest(c, "Unknown books route"));

  return app;
}
