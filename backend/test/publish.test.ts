import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "../src/storage/memory.js";
import { buildArtifacts, storageKey } from "../src/pipeline/artifacts.js";
import { publishBook, manifestKeyOf } from "../src/pipeline/publish.js";
import type { ParsedEpub } from "../src/epub/parse.js";
import { openDb } from "../src/node/db.js";
import { migrate } from "../src/db/migrate.js";
import { SCHEMA_SQL } from "../src/db/schema.js";
import { books, chapters } from "../src/db/tables.js";
import { eq } from "drizzle-orm";

function fakeParsed(chapterTitles: string[]): ParsedEpub {
  return {
    bookId: "testbook",
    metadata: { title: "சோதனை நூல்", author: "ஆசிரியர்", language: "ta" },
    chapters: chapterTitles.map((title, idx) => ({
      idx,
      href: `ch${idx}.xhtml`,
      title,
      lang: "ta",
      blocks: [{ t: "p" as const, text: `${title} உரை வாக்கியம் முதல். இரண்டாவது வாக்கியம்.` }],
      wordCount: 8,
      sentences: [`${title} உரை வாக்கியம் முதல்.`, "இரண்டாவது வாக்கியம்."],
    })),
    skipped: [],
    images: {},
    cover: { path: "cover.jpg", bytes: new Uint8Array([1, 2, 3]) },
    a11y: { issues: [], counts: {}, score: 100 },
  };
}

async function testDb() {
  const { sqlite, db } = openDb(":memory:");
  await migrate(sqlite);
  return db;
}

describe("schema", () => {
  it("embedded SCHEMA_SQL matches schema.sql (no drift)", async () => {
    const file = await readFile(
      fileURLToPath(new URL("../schema.sql", import.meta.url)),
      "utf8",
    );
    expect(SCHEMA_SQL).toBe(file.trimEnd());
  });
});

describe("publishBook", () => {
  it("creates book + chapter rows at version 1", async () => {
    const db = await testDb();
    const store = new MemoryStore();
    const parsed = fakeParsed(["முதல்", "இரண்டாம்"]);

    const manifestJson = await publishArtifacts(store, parsed);
    const result = await publishBook(db, parsed, manifestJson, null);

    expect(result).toEqual({
      bookId: "testbook",
      contentVersion: 1,
      changed: true,
      totalChapters: 2,
    });

    const book = await db
      .select()
      .from(books)
      .where(eq(books.id, "testbook"))
      .get();
    expect(book?.title).toBe("சோதனை நூல்");
    expect(book?.totalChapters).toBe(2);
    expect(book?.status).toBe("published");
    expect(book?.coverKey).toBe("books/testbook/cover.jpg");

    const rows = await db
      .select({ idx: chapters.idx, title: chapters.title })
      .from(chapters)
      .where(eq(chapters.bookId, "testbook"))
      .orderBy(chapters.idx);
    expect(rows.map((c) => c.idx)).toEqual([0, 1]);
    expect(rows[1]?.title).toBe("இரண்டாம்");
  });

  it("is idempotent: identical republish keeps version", async () => {
    const db = await testDb();
    const store = new MemoryStore();
    const parsed = fakeParsed(["முதல்", "இரண்டாம்"]);

    const manifestJson = await publishArtifacts(store, parsed);
    await publishBook(db, parsed, manifestJson, null);
    const previous = await readManifest(store);
    const second = await publishBook(db, parsed, manifestJson, previous);

    expect(second.changed).toBe(false);
    expect(second.contentVersion).toBe(1);
  });

  it("bumps content_version when manifest changes", async () => {
    const db = await testDb();
    const store = new MemoryStore();

    const first = fakeParsed(["முதல்", "இரண்டாம்"]);
    await publishBook(db, first, await publishArtifacts(store, first), null);

    const previous = await readManifest(store);
    const second = fakeParsed(["மாற்றப்பட்ட தலைப்பு", "இரண்டாம்", "மூன்றாம்"]);
    const manifestJson = await publishArtifacts(store, second);
    const result = await publishBook(db, second, manifestJson, previous);

    expect(result.changed).toBe(true);
    expect(result.contentVersion).toBe(2);

    const count = await db
      .select({ idx: chapters.idx })
      .from(chapters)
      .where(eq(chapters.bookId, "testbook"));
    expect(count.length).toBe(3);
  });
});

async function publishArtifacts(store: MemoryStore, parsed: ParsedEpub): Promise<string> {
  const manifestJson = buildArtifacts(parsed).find(
    (f) => f.path === manifestKeyOf(parsed.bookId),
  )!.data as string;
  for (const f of buildArtifacts(parsed)) await store.put(f.path, f.data);
  return manifestJson;
}

async function readManifest(store: MemoryStore): Promise<string | null> {
  const bytes = await store.get(storageKey("testbook", "manifest.json"));
  return bytes ? new TextDecoder().decode(bytes) : null;
}
