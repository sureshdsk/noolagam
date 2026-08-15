import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { NodeSqliteDb } from "../src/node/sqlite.js";
import { migrate } from "../src/db/migrate.js";
import { SCHEMA_SQL } from "../src/db/schema.js";
import { MemoryStore } from "../src/storage/memory.js";
import { buildArtifacts, storageKey } from "../src/pipeline/artifacts.js";
import { publishBook, manifestKeyOf } from "../src/pipeline/publish.js";
import type { ParsedEpub } from "../src/epub/parse.js";

function testDb(): NodeSqliteDb {
  const db = new NodeSqliteDb(new DatabaseSync(":memory:"));
  return db;
}

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
    const db = testDb();
    await migrate(db);
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

    const book = await db.get<{
      title: string;
      total_chapters: number;
      status: string;
      content_version: number;
      cover_key: string;
    }>("SELECT title, total_chapters, status, content_version, cover_key FROM books WHERE id = 'testbook'");
    expect(book?.title).toBe("சோதனை நூல்");
    expect(book?.total_chapters).toBe(2);
    expect(book?.status).toBe("published");
    expect(book?.cover_key).toBe("books/testbook/cover.jpg");

    const chapters = await db.all<{ idx: number; title: string }>(
      "SELECT idx, title FROM chapters WHERE book_id = 'testbook' ORDER BY idx",
    );
    expect(chapters.map((c) => c.idx)).toEqual([0, 1]);
    expect(chapters[1]?.title).toBe("இரண்டாம்");
  });

  it("is idempotent: identical republish keeps version", async () => {
    const db = testDb();
    await migrate(db);
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
    const db = testDb();
    await migrate(db);
    const store = new MemoryStore();

    const first = fakeParsed(["முதல்", "இரண்டாம்"]);
    await publishBook(db, first, await publishArtifacts(store, first), null);

    const previous = await readManifest(store);
    const second = fakeParsed(["மாற்றப்பட்ட தலைப்பு", "இரண்டாம்", "மூன்றாம்"]);
    const manifestJson = await publishArtifacts(store, second);
    const result = await publishBook(db, second, manifestJson, previous);

    expect(result.changed).toBe(true);
    expect(result.contentVersion).toBe(2);

    const count = await db.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM chapters WHERE book_id = 'testbook'",
    );
    expect(count?.n).toBe(3);
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
