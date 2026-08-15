import { Hono } from "hono";
import type { Context } from "hono";
import type { Db } from "../../db/types.js";
import type { ObjectStore } from "../../storage/types.js";
import {
  authenticate,
  badRequest,
  notFoundBook,
  notFoundChapter,
  unauthenticated,
  type AuthDeps,
} from "../guards.js";
import { FixedWindowRateLimiter } from "../ratelimit.js";

const PRESIGN_TTL_SECONDS = 15 * 60;

interface ChapterRow {
  idx: number;
  content_key: string | null;
  audio_key?: string | null;
}

interface BookKeysRow {
  cover_key: string | null;
  has_audio: number;
}

const coverLimiter = new FixedWindowRateLimiter(60);

function clientKey(c: Context): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
}

async function presign(
  store: ObjectStore,
  key: string,
): Promise<string | null> {
  try {
    return await store.presignGet(key, PRESIGN_TTL_SECONDS);
  } catch {
    return null;
  }
}

async function publishedBook(db: Db, bookId: string): Promise<BookKeysRow | null> {
  return db.get<BookKeysRow>(
    "SELECT cover_key, has_audio FROM books WHERE id = ? AND status = 'published'",
    [bookId],
  );
}

export function contentRoutes(
  db: () => Db,
  store: () => ObjectStore,
  auth: () => AuthDeps,
): Hono {
  const app = new Hono();

  app.get("/:bookId/chapters/:idx", async (c) => {
    const claims = await authenticate(c, auth());
    if (!claims) return unauthenticated(c);

    const bookId = c.req.param("bookId");
    const idxParam = c.req.param("idx");
    if (!/^\d+$/.test(idxParam)) return badRequest(c, "Chapter idx must be a non-negative integer");
    const idx = Number(idxParam);

    const book = await publishedBook(db(), bookId);
    if (!book) return notFoundBook(c, bookId);

    const chapter = await db().get<ChapterRow>(
      "SELECT idx, content_key FROM chapters WHERE book_id = ? AND idx = ?",
      [bookId, idx],
    );
    if (!chapter?.content_key) return notFoundChapter(c, bookId, idx);

    const url = await presign(store(), chapter.content_key);
    if (!url) {
      return c.json(
        { status: 503, type: "presign_unavailable", title: "Storage presigning unavailable" },
        503,
      );
    }
    return c.json({
      book_id: bookId,
      chapter_idx: idx,
      url,
      expires_in: PRESIGN_TTL_SECONDS,
    });
  });

  app.get("/:bookId/assets", async (c) => {
    const claims = await authenticate(c, auth());
    if (!claims) return unauthenticated(c);

    const bookId = c.req.param("bookId");
    const types = (c.req.query("type") ?? "chapters,cover").split(",").map((t) => t.trim());

    const book = await publishedBook(db(), bookId);
    if (!book) return notFoundBook(c, bookId);

    const urls: Record<string, unknown> = {};
    for (const type of types) {
      if (type === "cover") {
        if (book.cover_key) {
          const url = await presign(store(), book.cover_key);
          if (url) urls.cover = url;
        }
      } else if (type === "chapters") {
        const chapters = await db().all<ChapterRow>(
          "SELECT idx, content_key FROM chapters WHERE book_id = ? ORDER BY idx",
          [bookId],
        );
        const map: Record<string, string> = {};
        for (const ch of chapters) {
          const url = ch.content_key ? await presign(store(), ch.content_key) : null;
          if (url) map[String(ch.idx)] = url;
        }
        urls.chapters = map;
      } else if (type === "audio") {
        if (book.has_audio !== 1) continue;
        const chapters = await db().all<ChapterRow>(
          "SELECT idx, audio_key FROM chapters WHERE book_id = ? AND audio_key IS NOT NULL ORDER BY idx",
          [bookId],
        );
        const map: Record<string, string> = {};
        for (const ch of chapters) {
          const url = await presign(store(), ch.audio_key!);
          if (url) map[String(ch.idx)] = url;
        }
        urls.audio = map;
      } else {
        return badRequest(c, `Unknown asset type '${type}' (expected chapters|audio|cover)`);
      }
    }

    return c.json({
      book_id: bookId,
      expires_in: PRESIGN_TTL_SECONDS,
      urls,
    });
  });

  app.get("/:bookId/cover", async (c) => {
    const bookId = c.req.param("bookId");
    if (!coverLimiter.allow(clientKey(c))) {
      return c.json(
        { status: 429, type: "rate_limited", title: "Too many cover requests" },
        429,
      );
    }
    const book = await publishedBook(db(), bookId);
    if (!book?.cover_key) return notFoundBook(c, bookId);
    const url = await presign(store(), book.cover_key);
    if (!url) {
      return c.json(
        { status: 503, type: "presign_unavailable", title: "Storage presigning unavailable" },
        503,
      );
    }
    return c.redirect(url, 302);
  });

  return app;
}
