import type { Context } from "hono";
import { problem } from "./problems.js";

const MAX_EPUB_BYTES = 20 * 1024 * 1024;

export function adminUnauthorized(c: Context) {
  return problem(c, 401, {
    type: "unauthenticated",
    title: "Admin authentication required",
    detail: "Provide the admin API key via the X-Admin-Key header.",
  });
}

export function adminForbidden(c: Context) {
  return problem(c, 403, {
    type: "forbidden",
    title: "Invalid admin key",
  });
}

export function adminUnconfigured(c: Context) {
  return problem(c, 403, {
    type: "admin_not_configured",
    title: "Admin API key not configured",
    detail: "Set ADMIN_API_KEY (env var or secret) to enable job submission.",
  });
}

export function checkAdmin(
  c: Context,
  adminApiKey: string | undefined,
): ReturnType<typeof adminUnauthorized> | ReturnType<typeof adminForbidden> | ReturnType<typeof adminUnconfigured> | null {
  if (!adminApiKey) return adminUnconfigured(c);
  const provided = c.req.header("x-admin-key");
  if (!provided) return adminUnauthorized(c);
  if (provided !== adminApiKey) return adminForbidden(c);
  return null;
}

export function epubTooLarge(c: Context) {
  return problem(c, 413, {
    type: "payload_too_large",
    title: "EPUB too large",
    detail: `Maximum EPUB size is ${MAX_EPUB_BYTES} bytes.`,
  });
}

export function contentLengthExceedsLimit(c: Context): boolean {
  const header = c.req.header("content-length");
  if (header === undefined) return false;
  const length = Number(header);
  return Number.isFinite(length) && length > MAX_EPUB_BYTES;
}

export function missingEpubFile(c: Context) {
  return problem(c, 400, {
    type: "validation_error",
    title: "Missing epub file",
    detail: "Submit multipart/form-data with an 'file' field containing the EPUB.",
  });
}

export { MAX_EPUB_BYTES };
