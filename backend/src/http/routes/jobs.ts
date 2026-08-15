import { Hono } from "hono";
import type { Context } from "hono";
import type { Db } from "../../db/types.js";
import type { ObjectStore } from "../../storage/types.js";
import type { LlmConfig } from "../../llm/client.js";
import {
  claimJob,
  completeJob,
  createJob,
  failJob,
  getJob,
  incomingKey,
  listJobs,
  serializeJob,
} from "../../pipeline/jobs.js";
import { processEpubBook, runSummariesJob } from "../../pipeline/run.js";
import { slugifyBookId } from "../../util/slug.js";
import {
  checkAdmin,
  contentLengthExceedsLimit,
  epubTooLarge,
  missingEpubFile,
} from "../admin.js";
import { problem } from "../problems.js";

export interface JobsDeps {
  db: () => Db;
  store: () => ObjectStore;
  adminApiKey: () => string | undefined;
  llm: () => LlmConfig | null;
}

async function defer(c: Context, work: Promise<void>): Promise<void> {
  try {
    c.executionCtx.waitUntil(work);
  } catch {
    await work;
  }
}

async function executeJob(
  db: Db,
  store: ObjectStore,
  jobId: string,
  bytes: Uint8Array | null,
  llm: () => LlmConfig | null,
): Promise<void> {
  const claimed = await claimJob(db, jobId);
  if (!claimed) return;
  try {
    const job = await getJob(db, jobId);
    const bookId = job?.book_id;
    if (!bookId) throw new Error("job has no book_id");
    if (job.type === "generate_summaries") {
      await runSummariesJob(db, store, llm(), bookId);
    } else {
      const epubBytes = bytes ?? (await store.get(incomingKey(bookId)));
      if (!epubBytes) throw new Error(`no epub at ${incomingKey(bookId)}`);
      await processEpubBook(db, store, epubBytes, bookId);
    }
    await completeJob(db, jobId);
  } catch (err) {
    await failJob(
      db,
      jobId,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export function jobsRoutes(deps: JobsDeps): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const denied = checkAdmin(c, deps.adminApiKey());
    if (denied) return denied;
    if (contentLengthExceedsLimit(c)) return epubTooLarge(c);

    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await c.req.json().catch(() => null)) as
        | { type?: string; book_id?: string }
        | null;
      if (!body || body.type !== "generate_summaries" || !body.book_id) {
        return problem(c, 400, {
          type: "validation_error",
          title: "Invalid job submission",
          detail: "JSON body must be {\"type\":\"generate_summaries\",\"book_id\":\"…\"}.",
        });
      }
      const book = await deps
        .db()
        .get<{ id: string }>("SELECT id FROM books WHERE id = ?", [body.book_id]);
      if (!book) {
        return problem(c, 404, {
          type: "book_not_found",
          title: "Book not found",
          detail: `No book with id '${body.book_id}'.`,
        });
      }
      const job = await createJob(deps.db(), { bookId: body.book_id, type: "generate_summaries" });
      await defer(c, executeJob(deps.db(), deps.store(), job.id, null, deps.llm));
      return c.body(
        JSON.stringify({ id: job.id, book_id: job.book_id, status: job.status }),
        202,
        { "content-type": "application/json", location: `/v1/jobs/${job.id}` },
      );
    }

    let file: File | null = null;
    let requestedBookId: string | undefined;
    try {
      const body = await c.req.parseBody({ all: false });
      const value = body["file"];
      if (value instanceof File) file = value;
      const bookIdField = body["bookId"];
      if (typeof bookIdField === "string" && bookIdField.trim().length > 0) {
        requestedBookId = bookIdField.trim();
      }
    } catch {
      return missingEpubFile(c);
    }
    if (!file) return missingEpubFile(c);
    if (file.size > 20 * 1024 * 1024) return epubTooLarge(c);

    const bookId = slugifyBookId(requestedBookId ?? file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const store = deps.store();
    await store.put(incomingKey(bookId), bytes, {
      contentType: "application/epub+zip",
    });

    const job = await createJob(deps.db(), { bookId, type: "process_epub" });
    await defer(c, executeJob(deps.db(), store, job.id, bytes, deps.llm));

    return c.body(
      JSON.stringify({ id: job.id, book_id: job.book_id, status: job.status }),
      202,
      { "content-type": "application/json", location: `/v1/jobs/${job.id}` },
    );
  });

  app.get("/", async (c) => {
    const denied = checkAdmin(c, deps.adminApiKey());
    if (denied) return denied;
    const status = c.req.query("status");
    const jobs = await listJobs(deps.db(), status);
    return c.json({ items: jobs.map(serializeJob) });
  });

  app.get("/:id", async (c) => {
    const denied = checkAdmin(c, deps.adminApiKey());
    if (denied) return denied;
    const job = await getJob(deps.db(), c.req.param("id"));
    if (!job) {
      return problem(c, 404, {
        type: "job_not_found",
        title: "Job not found",
      });
    }
    return c.json(serializeJob(job));
  });

  return app;
}

export { executeJob };
