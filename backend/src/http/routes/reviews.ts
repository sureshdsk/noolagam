import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { checkAdmin } from "../admin.js";
import type { OrmDb } from "../../db/index.js";
import { books, reviews } from "../../db/tables.js";
import { badRequest, notFoundBook } from "../guards.js";

function serializeReview(row: {
  id: number;
  book_id: string;
  book_title: string;
  book_author: string | null;
  username: string;
  review_text: string;
  rating: number;
  is_hidden: number | boolean;
  created_at: string;
}) {
  return {
    id: row.id,
    book_id: row.book_id,
    book_title: row.book_title,
    book_author: row.book_author,
    username: row.username,
    review_text: row.review_text,
    rating: row.rating,
    is_hidden: Boolean(row.is_hidden),
    created_at: row.created_at,
  };
}

export function reviewRoutes(db: () => OrmDb, adminApiKey: () => string | undefined): Hono {
  const app = new Hono();

  app.post("/reviews", async (c) => {
    const body = await c.req.json().catch(() => null) as {
      bookId?: string;
      username?: string;
      reviewText?: string;
      rating?: number;
    } | null;

    if (!body || !body.bookId || !body.username || !body.reviewText || body.rating === undefined) {
      return badRequest(c, "Required fields: bookId, username, reviewText, rating");
    }

    const book = await db()
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
      })
      .from(books)
      .where(eq(books.id, body.bookId))
      .get();

    if (!book) return notFoundBook(c, body.bookId);

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return badRequest(c, "rating must be an integer between 1 and 5");
    }

    const username = String(body.username).trim();
    const reviewText = String(body.reviewText).trim();
    if (!username || !reviewText) {
      return badRequest(c, "username and reviewText are required");
    }

    const result = await db()
      .insert(reviews)
      .values({
        bookId: book.id,
        bookTitle: book.title,
        bookAuthor: book.author,
        username,
        reviewText,
        rating,
        isHidden: false,
      })
      .returning();

    const created = result[0];
    if (!created) {
      return c.json({ error: "Failed to create review" }, 500);
    }

    return c.json(serializeReview({
      id: created.reviewId,
      book_id: created.bookId,
      book_title: created.bookTitle,
      book_author: created.bookAuthor,
      username: created.username,
      review_text: created.reviewText,
      rating: created.rating,
      is_hidden: created.isHidden,
      created_at: created.createdAt,
    }), 201);
  });

  app.get("/reviews", async (c) => {
    const adminDenied = checkAdmin(c, adminApiKey());
    if (adminDenied) return adminDenied;

    const rows = await db()
      .select()
      .from(reviews)
      .orderBy(sql`${reviews.createdAt} desc`);

    return c.json({
      items: rows.map((row) => serializeReview({
        id: row.reviewId,
        book_id: row.bookId,
        book_title: row.bookTitle,
        book_author: row.bookAuthor,
        username: row.username,
        review_text: row.reviewText,
        rating: row.rating,
        is_hidden: row.isHidden,
        created_at: row.createdAt,
      })),
      total: rows.length,
    });
  });

  app.get("/books/:bookId/reviews", async (c) => {
    const bookId = c.req.param("bookId");
    const rows = await db()
      .select()
      .from(reviews)
      .where(and(eq(reviews.bookId, bookId), eq(reviews.isHidden, false)))
      .orderBy(sql`${reviews.createdAt} desc`);

    return c.json({
      items: rows.map((row) => serializeReview({
        id: row.reviewId,
        book_id: row.bookId,
        book_title: row.bookTitle,
        book_author: row.bookAuthor,
        username: row.username,
        review_text: row.reviewText,
        rating: row.rating,
        is_hidden: row.isHidden,
        created_at: row.createdAt,
      })),
      total: rows.length,
    });
  });

  app.patch("/reviews/:id/hidden", async (c) => {
    const adminDenied = checkAdmin(c, adminApiKey());
    if (adminDenied) return adminDenied;

    const reviewId = Number(c.req.param("id"));
    if (!Number.isInteger(reviewId)) {
      return badRequest(c, "review id must be an integer");
    }

    const body = await c.req.json().catch(() => null) as { hidden?: boolean } | null;
    const hidden = body?.hidden ?? true;

    const result = await db()
      .update(reviews)
      .set({ isHidden: hidden })
      .where(eq(reviews.reviewId, reviewId))
      .returning();

    const updated = result[0];
    if (!updated) {
      return c.json({ error: "Review not found" }, 404);
    }

    return c.json({
      id: updated.reviewId,
      hidden: Boolean(updated.isHidden),
    });
  });

  return app;
}
