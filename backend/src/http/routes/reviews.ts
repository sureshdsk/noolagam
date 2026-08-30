import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import type { OrmDb } from "../../db/index.js";
import { books, reviews, users } from "../../db/tables.js";
import {
  authenticate,
  badRequest,
  notFoundBook,
  unauthenticated,
  type AuthDeps,
} from "../guards.js";

export function reviewRoutes(
  db: () => OrmDb,
  auth: () => AuthDeps,
): Hono {
  const app = new Hono();

  // GET /:bookId/reviews
  app.get("/:bookId/reviews", async (c) => {
    const bookId = c.req.param("bookId");

    // Check if the book exists and is published
    const book = await db()
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book) return notFoundBook(c, bookId);

    // Retrieve active reviews for this book
    const rows = await db()
      .select()
      .from(reviews)
      .where(and(eq(reviews.bookId, bookId), eq(reviews.isHidden, 0)))
      .orderBy(desc(reviews.createdAt));

    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        book_id: r.bookId,
        user_id: r.userId,
        rating: r.rating,
        review_text: r.reviewText ?? "",
        created_at: r.createdAt,
      })),
    });
  });

  // POST /:bookId/reviews
  app.post("/:bookId/reviews", async (c) => {
    const claims = await authenticate(c, auth());
    if (!claims) return unauthenticated(c);
    const userId = claims.sub;

    const bookId = c.req.param("bookId");

    // Check if the book exists and is published
    const book = await db()
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published")))
      .get();
    if (!book) return notFoundBook(c, bookId);

    // Parse request body
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return badRequest(c, "Invalid JSON body");
    }

    const rating = Number(body.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return badRequest(c, "Rating must be an integer between 1 and 5");
    }

    const reviewText = body.review_text?.toString() ?? "";

    const reviewId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Ensure the user exists in the users table to satisfy foreign key constraints
    const userExists = await db()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!userExists) {
      await db()
        .insert(users)
        .values({
          id: userId,
          createdAt,
        })
        .run();
    }

    // Insert the review
    await db()
      .insert(reviews)
      .values({
        id: reviewId,
        bookId,
        userId,
        rating,
        reviewText,
        isHidden: 0,
        createdAt,
      })
      .run();

    return c.json(
      {
        id: reviewId,
        book_id: bookId,
        user_id: userId,
        rating,
        review_text: reviewText,
        created_at: createdAt,
      },
      201,
    );
  });

  return app;
}
