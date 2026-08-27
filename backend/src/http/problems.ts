import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ProblemInit {
  type: string;
  title: string;
  detail?: string;
}

export function problem(
  c: Context,
  status: ContentfulStatusCode,
  body: ProblemInit,
) {
  return c.json({ status, ...body }, status, {
    "content-type": "application/problem+json",
  });
}
