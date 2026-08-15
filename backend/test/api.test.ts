import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NodeSqliteDb } from "../src/node/sqlite.js";
import { migrate } from "../src/db/migrate.js";
import { createApp } from "../src/http/app.js";
import { MemoryStore } from "../src/storage/memory.js";
import type { ObjectStore } from "../src/storage/types.js";
import type { AuthDeps } from "../src/http/guards.js";
import { signRs256ForTesting, type SigningJwk } from "../src/http/auth.js";

let tokenKey: { publicJwk: Record<string, unknown>; privateJwk: SigningJwk } | null = null;

async function getTokenKey() {
  if (!tokenKey) {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    tokenKey = {
      publicJwk: (await crypto.subtle.exportKey("jwk", pair.publicKey)) as Record<
        string,
        unknown
      >,
      privateJwk: (await crypto.subtle.exportKey(
        "jwk",
        pair.privateKey,
      )) as unknown as SigningJwk,
    };
  }
  return tokenKey;
}

async function makeToken(): Promise<string> {
  const { privateJwk } = await getTokenKey();
  return signRs256ForTesting(
    privateJwk,
    { alg: "RS256" },
    { sub: "user_123", iss: "https://clerk.test", exp: Math.floor(Date.now() / 1000) + 600 },
  );
}

class FakePresignStore extends MemoryStore {
  async presignGet(key: string): Promise<string> {
    return `https://cdn.example.com/${key}?sig=fake`;
  }
}

async function seed(): Promise<NodeSqliteDb> {
  const db = new NodeSqliteDb(new DatabaseSync(":memory:"));
  await migrate(db);
  await db.run(
    `INSERT INTO books (id, title, author, language, cover_key, manifest_key, total_chapters,
                        has_audio, a11y_score, content_version, status, published_at)
     VALUES ('testbook', 'சோதனை நூல்', 'ஆசிரியர்', 'ta', 'books/testbook/cover.jpg',
             'books/testbook/manifest.json', 2, 0, 90, 1, 'published', '2026-01-01T00:00:00Z')`,
  );
  await db.run(
    `INSERT INTO books (id, title, author, language, total_chapters, has_audio, a11y_score,
                        content_version, status)
     VALUES ('draft', 'வரைவு', NULL, 'ta', 1, 0, NULL, 1, 'processing')`,
  );
  for (const [idx, title] of [["0", "முதல்"], ["1", "இரண்டாம்"]]) {
    await db.run(
      `INSERT INTO chapters (id, book_id, idx, title, word_count, content_key)
       VALUES (?, 'testbook', ?, ?, 100, ?)`,
      [`testbook:${idx}`, idx, title, `books/testbook/chapters/${idx}.json`],
    );
  }
  return db;
}

function makeApp(
  db: NodeSqliteDb,
  opts: { enforce?: boolean; store?: ObjectStore; adminApiKey?: string } = {},
) {
  const store = opts.store ?? new FakePresignStore();
  const auth: AuthDeps = {
    enforce: opts.enforce ?? false,
    jwksUrl: "https://clerk.test/jwks",
    issuer: "https://clerk.test",
    fetchJwks: async () => [(await getTokenKey()).publicJwk],
  };
  return createApp({
    db: () => db,
    store: () => store,
    auth: () => auth,
    adminApiKey: () => opts.adminApiKey,
    llm: () => null,
  });
}

describe("GET /v1/books", () => {
  it("lists only published books with pagination envelope", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: { id: string }[];
      page: number;
      limit: number;
      total: number;
    };
    expect(body.total).toBe(1);
    expect(body.items.map((b) => b.id)).toEqual(["testbook"]);
    expect(body.page).toBe(1);
  });

  it("searches by Tamil substring", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books?q=சோதனை");
    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(1);
    const miss = await app.request("/v1/books?q=இல்லாதது");
    expect(((await miss.json()) as { total: number }).total).toBe(0);
  });

  it("escapes LIKE wildcards in query", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books?q=%25");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { total: number }).total).toBe(0);
  });
});

describe("GET /v1/books/:id", () => {
  it("returns detail with chapter TOC", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books/testbook");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      title: string;
      a11y_score: number;
      chapters: { idx: number; title: string }[];
    };
    expect(body.title).toBe("சோதனை நூல்");
    expect(body.a11y_score).toBe(90);
    expect(body.chapters.map((ch) => ch.idx)).toEqual([0, 1]);
  });

  it("hides unpublished books with 404 problem+json", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books/draft");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
  });
});

describe("GET /v1/books/:id/chapters", () => {
  it("lists chapters", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books/testbook/chapters");
    const body = (await res.json()) as { items: { idx: number; word_count: number }[] };
    expect(body.items.length).toBe(2);
    expect(body.items[0]?.word_count).toBe(100);
  });
});

describe("content routes with AUTH_ENFORCE=true", () => {
  it("rejects anonymous chapter access with 401", async () => {
    const app = makeApp(await seed(), { enforce: true });
    const res = await app.request("/v1/books/testbook/chapters/0");
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
  });

  it("presigns chapter JSON for authenticated users", async () => {
    const app = makeApp(await seed(), { enforce: true });
    const token = await makeToken();
    const res = await app.request("/v1/books/testbook/chapters/0", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string; expires_in: number };
    expect(body.url).toContain("books/testbook/chapters/0.json");
    expect(body.expires_in).toBe(900);
  });

  it("batch-presigns assets", async () => {
    const app = makeApp(await seed(), { enforce: true });
    const token = await makeToken();
    const res = await app.request("/v1/books/testbook/assets?type=chapters,cover", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      urls: { cover: string; chapters: Record<string, string> };
    };
    expect(body.urls.cover).toContain("cover.jpg");
    expect(Object.keys(body.urls.chapters).sort()).toEqual(["0", "1"]);
  });

  it("rejects unknown asset types", async () => {
    const app = makeApp(await seed(), { enforce: true });
    const token = await makeToken();
    const res = await app.request("/v1/books/testbook/assets?type=bogus", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(400);
  });
});

describe("auth enforcement depends on env", () => {
  it("allows anonymous content when AUTH_ENFORCE is false", async () => {
    const app = makeApp(await seed(), { enforce: false });
    const res = await app.request("/v1/books/testbook/chapters/1");
    expect(res.status).toBe(200);
  });
});

describe("cover route", () => {
  it("redirects anonymously to presigned cover", async () => {
    const app = makeApp(await seed());
    const res = await app.request("/v1/books/testbook/cover");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("cover.jpg");
  });

  it("404s when book has no cover", async () => {
    const db = await seed();
    await db.run("UPDATE books SET cover_key = NULL WHERE id = 'testbook'");
    const app = makeApp(db);
    const res = await app.request("/v1/books/testbook/cover");
    expect(res.status).toBe(404);
  });
});
