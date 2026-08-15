import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { problem } from "./problems.js";
import { verifyRs256, type JwtClaims } from "./auth.js";

export interface AuthDeps {
  enforce: boolean;
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
  fetchJwks?: () => Promise<Record<string, unknown>[]>;
}

const DEV_CLAIMS: JwtClaims = { sub: "dev-user" };

export async function authenticate(
  c: Context,
  deps: AuthDeps,
): Promise<JwtClaims | null> {
  if (!deps.enforce) return DEV_CLAIMS;

  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);

  let keys: Record<string, unknown>[];
  if (deps.fetchJwks) {
    keys = await deps.fetchJwks();
  } else if (deps.jwksUrl) {
    const res = await fetch(deps.jwksUrl);
    if (!res.ok) return null;
    const body = (await res.json()) as { keys?: Record<string, unknown>[] };
    keys = body.keys ?? [];
  } else {
    return null;
  }

  return verifyRs256(token, {
    jwks: keys,
    issuer: deps.issuer,
    audience: deps.audience,
  });
}

export function unauthenticated(c: Context) {
  return problem(c, 401, {
    type: "unauthenticated",
    title: "Authentication required",
    detail: "Provide a valid Bearer token to access content.",
  });
}

export function notFoundBook(c: Context, bookId: string) {
  return problem(c, 404, {
    type: "book_not_found",
    title: "Book not found",
    detail: `No published book with id '${bookId}'.`,
  });
}

export function notFoundChapter(c: Context, bookId: string, idx: number) {
  return problem(c, 404, {
    type: "chapter_not_found",
    title: "Chapter not found",
    detail: `Book '${bookId}' has no chapter ${idx}.`,
  });
}

export function badRequest(c: Context, detail: string) {
  return problem(c, 400, {
    type: "validation_error",
    title: "Invalid request",
    detail,
  });
}

export type { ContentfulStatusCode };
