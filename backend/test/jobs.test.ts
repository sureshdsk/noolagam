import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createApp } from "../src/http/app.js";
import { books, chapters } from "../src/db/tables.js";
import { openDb } from "../src/node/db.js";
import { migrate } from "../src/db/migrate.js";
import { MemoryStore } from "../src/storage/memory.js";

const DY_PATH = fileURLToPath(
  new URL("../../assets/books/deiva_yaanai/deiva_yaanai.epub", import.meta.url),
);

class FakePresignStore extends MemoryStore {
  async presignGet(key: string): Promise<string> {
    return `https://cdn.example.com/${key}?sig=fake`;
  }
}

async function makeApp(opts: { adminApiKey?: string } = {}) {
  const { sqlite, db } = openDb(":memory:");
  await migrate(sqlite);
  const store = new FakePresignStore();
  const app = createApp({
    db: () => db,
    store: () => store,
    auth: () => ({ enforce: false }),
    adminApiKey: () => opts.adminApiKey,
    llm: () => null,
  });
  return { app, db };
}

async function postEpub(
  app: ReturnType<typeof createApp>,
  opts: { key?: string; path?: string; bookId?: string } = {},
): Promise<Response> {
  const path = opts.path ?? DY_PATH;
  const bytes = new Uint8Array(await readFile(path));
  const form = new FormData();
  form.append("file", new Blob([bytes]), "deiva_yaanai.epub");
  if (opts.bookId) form.append("bookId", opts.bookId);
  const headers: Record<string, string> = {};
  if (opts.key !== undefined) headers["x-admin-key"] = opts.key;
  return app.request("/v1/jobs", { method: "POST", body: form, headers });
}

describe("POST /v1/jobs admin guard", () => {
  it("403s when ADMIN_API_KEY is not configured", async () => {
    const { app } = await makeApp();
    const res = await postEpub(app);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { type: string };
    expect(body.type).toBe("admin_not_configured");
  });

  it("401s without the key, 403 with a wrong key", async () => {
    const { app } = await makeApp({ adminApiKey: "secret123" });
    expect((await postEpub(app)).status).toBe(401);
    expect((await postEpub(app, { key: "wrong" })).status).toBe(403);
  });

  it("400s when no file field is present", async () => {
    const { app } = await makeApp({ adminApiKey: "secret123" });
    const res = await app.request("/v1/jobs", {
      method: "POST",
      body: new FormData(),
      headers: { "x-admin-key": "secret123" },
    });
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!existsSync(DY_PATH))("POST /v1/jobs end-to-end (real epub)", () => {
  it("processes the book and publishes it to the catalog", async () => {
    const { app, db } = await makeApp({ adminApiKey: "secret123" });

    const res = await postEpub(app, { key: "secret123" });
    expect(res.status).toBe(202);
    const submitted = (await res.json()) as { id: string; book_id: string; status: string };
    expect(submitted.book_id).toBe("deiva_yaanai");
    expect(res.headers.get("location")).toBe(`/v1/jobs/${submitted.id}`);

    const jobRes = await app.request(`/v1/jobs/${submitted.id}`, {
      headers: { "x-admin-key": "secret123" },
    });
    const job = (await jobRes.json()) as { status: string; error: string | null };
    expect(job.status).toBe("completed");
    expect(job.error).toBeNull();

    const booksRes = await app.request("/v1/books");
    const books = (await booksRes.json()) as { items: { id: string; total_chapters: number }[] };
    const book = books.items.find((b) => b.id === "deiva_yaanai");
    expect(book?.total_chapters).toBe(24);

    const chapterRes = await app.request("/v1/books/deiva_yaanai/chapters/1");
    const chapter = (await chapterRes.json()) as { url: string };
    expect(chapter.url).toContain("books/deiva_yaanai/chapters/1.json");

    const firstChapter = await db
      .select({ contentKey: chapters.contentKey })
      .from(chapters)
      .where(eq(chapters.bookId, "deiva_yaanai"))
      .orderBy(chapters.idx)
      .limit(1);
    expect(firstChapter[0]?.contentKey).toBe("books/deiva_yaanai/chapters/0.json");
  });

  it("fails the job with a readable error for invalid epubs", async () => {
    const { app } = await makeApp({ adminApiKey: "secret123" });
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([1, 2, 3])]), "broken.epub");
    const res = await app.request("/v1/jobs", {
      method: "POST",
      body: form,
      headers: { "x-admin-key": "secret123" },
    });
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as { id: string };
    const jobRes = await app.request(`/v1/jobs/${id}`, {
      headers: { "x-admin-key": "secret123" },
    });
    const job = (await jobRes.json()) as { status: string; error: string | null };
    expect(job.status).toBe("failed");
    expect(job.error).toContain("EPUB");
  });
});

describe("POST /v1/jobs (generate_summaries)", () => {
  async function seededApp(opts: { adminApiKey?: string } = {}) {
    const { app, db } = await makeApp(opts);
    await db.insert(books).values({
      id: "b1",
      title: "நூல்",
      language: "ta",
      totalChapters: 1,
      contentVersion: 1,
      status: "published",
    });
    await db.insert(chapters).values({
      id: "b1:0",
      bookId: "b1",
      idx: 0,
      title: "முதல்",
      wordCount: 10,
      contentKey: "books/b1/chapters/0.json",
    });
    return { app, db };
  }

  it("rejects invalid JSON submissions", async () => {
    const { app } = await seededApp({ adminApiKey: "secret123" });
    const res = await app.request("/v1/jobs", {
      method: "POST",
      headers: { "x-admin-key": "secret123", "content-type": "application/json" },
      body: JSON.stringify({ type: "bogus" }),
    });
    expect(res.status).toBe(400);
  });

  it("404s for unknown books", async () => {
    const { app } = await seededApp({ adminApiKey: "secret123" });
    const res = await app.request("/v1/jobs", {
      method: "POST",
      headers: { "x-admin-key": "secret123", "content-type": "application/json" },
      body: JSON.stringify({ type: "generate_summaries", book_id: "ghost" }),
    });
    expect(res.status).toBe(404);
  });

  it("fails the job with a clear error when LLM is unconfigured", async () => {
    const { app } = await seededApp({ adminApiKey: "secret123" });
    const res = await app.request("/v1/jobs", {
      method: "POST",
      headers: { "x-admin-key": "secret123", "content-type": "application/json" },
      body: JSON.stringify({ type: "generate_summaries", book_id: "b1" }),
    });
    expect(res.status).toBe(202);
    const { id } = (await res.json()) as { id: string };
    const jobRes = await app.request(`/v1/jobs/${id}`, {
      headers: { "x-admin-key": "secret123" },
    });
    const job = (await jobRes.json()) as { status: string; error: string | null };
    expect(job.status).toBe("failed");
    expect(job.error).toContain("LLM not configured");
  });
});

describe("GET /v1/jobs", () => {
  it("lists jobs and filters by status (admin only)", async () => {
    const { app } = await makeApp({ adminApiKey: "secret123" });
    expect((await app.request("/v1/jobs")).status).toBe(401);

    const listRes = await app.request("/v1/jobs?status=completed", {
      headers: { "x-admin-key": "secret123" },
    });
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });

  it("404s unknown job ids", async () => {
    const { app } = await makeApp({ adminApiKey: "secret123" });
    const res = await app.request("/v1/jobs/00000000-0000-0000-0000-000000000000", {
      headers: { "x-admin-key": "secret123" },
    });
    expect(res.status).toBe(404);
  });
});
