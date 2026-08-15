import { Hono } from "hono";
import type { Context } from "hono";
import type { Db } from "../../db/types.js";
import type { ObjectStore } from "../../storage/types.js";
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
import { processEpubBook } from "../../pipeline/run.js";
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
): Promise<void> {
  const claimed = await claimJob(db, jobId);
  if (!claimed) return;
  try {
    const job = await getJob(db, jobId);
    const bookId = job?.book_id;
    if (!bookId) throw new Error("job has no book_id");
    const epubBytes = bytes ?? (await store.get(incomingKey(bookId)));
    if (!epubBytes) throw new Error(`no epub at ${incomingKey(bookId)}`);
    await processEpubBook(db, store, epubBytes, bookId);
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
    await defer(c, executeJob(deps.db(), store, job.id, bytes));

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
