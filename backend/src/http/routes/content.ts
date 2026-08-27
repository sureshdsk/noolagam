import { Hono } from "hono";
import type { Context } from "hono";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { OrmDb } from "../../db/index.js";
import { books, chapters } from "../../db/tables.js";
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

export function contentRoutes(
  db: () => OrmDb,
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

    const book = await db()
      .select({ coverKey: books.coverKey, hasAudio: books.hasAudio })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book) return notFoundBook(c, bookId);

    const chapter = await db()
      .select({ idx: chapters.idx, contentKey: chapters.contentKey })
      .from(chapters)
      .where(and(eq(chapters.bookId, bookId), eq(chapters.idx, idx)))
      .get();
    if (!chapter?.contentKey) return notFoundChapter(c, bookId, idx);

    const url = await presign(store(), chapter.contentKey);
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

    const book = await db()
      .select({ coverKey: books.coverKey, hasAudio: books.hasAudio })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book) return notFoundBook(c, bookId);

    const urls: Record<string, unknown> = {};
    for (const type of types) {
      if (type === "cover") {
        if (book.coverKey) {
          const url = await presign(store(), book.coverKey);
          if (url) urls.cover = url;
        }
      } else if (type === "chapters") {
        const chapterRows = await db()
          .select({ idx: chapters.idx, contentKey: chapters.contentKey })
          .from(chapters)
          .where(eq(chapters.bookId, bookId))
          .orderBy(asc(chapters.idx));
        const map: Record<string, string> = {};
        for (const ch of chapterRows) {
          const url = ch.contentKey ? await presign(store(), ch.contentKey) : null;
          if (url) map[String(ch.idx)] = url;
        }
        urls.chapters = map;
      } else if (type === "audio") {
        if (book.hasAudio !== 1) continue;
        const audioRows = await db()
          .select({ idx: chapters.idx, audioKey: chapters.audioKey })
          .from(chapters)
          .where(and(eq(chapters.bookId, bookId), isNotNull(chapters.audioKey)))
          .orderBy(asc(chapters.idx));
        const map: Record<string, string> = {};
        for (const ch of audioRows) {
          const url = await presign(store(), ch.audioKey!);
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
    const book = await db()
      .select({ coverKey: books.coverKey })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book?.coverKey) return notFoundBook(c, bookId);
    const url = await presign(store(), book.coverKey);
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
