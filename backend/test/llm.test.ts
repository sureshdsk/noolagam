import { describe, expect, it } from "vitest";
import { chatCompletion, LlmError, llmConfigFromEnv, type LlmConfig } from "../src/llm/client.js";
import { generateBookSummaries } from "../src/llm/summaries.js";
import { runSummariesJob, summariesKey } from "../src/pipeline/run.js";
import { DatabaseSync } from "node:sqlite";
import { NodeSqliteDb } from "../src/node/sqlite.js";
import { migrate } from "../src/db/migrate.js";
import { MemoryStore } from "../src/storage/memory.js";

const CFG: LlmConfig = {
  baseUrl: "https://llm.example.com/v1",
  apiKey: "test-key",
  model: "test-model",
};

describe("llmConfigFromEnv", () => {
  it("requires all three vars", () => {
    expect(llmConfigFromEnv({})).toBeNull();
    expect(llmConfigFromEnv({ LLM_BASE_URL: "x", LLM_API_KEY: "y" })).toBeNull();
    expect(
      llmConfigFromEnv({ LLM_BASE_URL: "https://x/", LLM_API_KEY: "y", LLM_MODEL: "z" }),
    ).toEqual({ baseUrl: "https://x", apiKey: "y", model: "z" });
  });
});

describe("chatCompletion", () => {
  it("sends an OpenAI-compatible request", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "  விடை  " } }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const out = await chatCompletion(CFG, [{ role: "user", content: "கேள்வி" }], {
        maxOutputTokens: 100,
      });
      expect(out).toBe("விடை");
      expect(calls[0]?.url).toBe("https://llm.example.com/v1/chat/completions");
      expect((calls[0]?.init.headers as Record<string, string>)["authorization"]).toBe(
        "Bearer test-key",
      );
      const body = JSON.parse(String(calls[0]?.init.body)) as {
        model: string;
        messages: { role: string }[];
        max_tokens: number;
      };
      expect(body.model).toBe("test-model");
      expect(body.messages[0]?.role).toBe("user");
      expect(body.max_tokens).toBe(100);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("throws LlmError on non-200", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("nope", { status: 429 })) as typeof fetch;
    try {
      await expect(chatCompletion(CFG, [{ role: "user", content: "x" }])).rejects.toThrow(
        LlmError,
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("generateBookSummaries", () => {
  it("summarizes each chapter then the book, with Tamil prompts", async () => {
    const prompts: string[] = [];
    const fake = async (messages: { content: string }[]): Promise<string> => {
      prompts.push(messages[0]!.content);
      return prompts.length <= 2 ? "அத்தியாய சுருக்கம்" : "நூல் சுருக்கம்";
    };
    const result = await generateBookSummaries(fake, [
      { idx: 0, title: "முதல்", text: "உரை ஒன்று." },
      { idx: 1, title: "இரண்டாம்", text: "உரை இரண்டு." },
    ]);
    expect(result.chapterSummaries.map((c) => c.idx)).toEqual([0, 1]);
    expect(result.bookSummary).toBe("நூல் சுருக்கம்");
    expect(prompts[0]).toContain("3 அல்லது 4 வரிகளில்");
    expect(prompts[0]).toContain("முதல்");
    expect(prompts[2]).toContain("8 முதல் 10 வரிகளில்");
  });

  it("retries empty responses before giving a placeholder", async () => {
    let calls = 0;
    const fake = async (): Promise<string> => {
      calls++;
      return calls < 3 ? "" : "பின்னர் வந்த சுருக்கம்";
    };
    const result = await generateBookSummaries(fake, [
      { idx: 0, title: "ஒன்று", text: "உரை." },
    ]);
    expect(result.chapterSummaries[0]?.summary).toBe("பின்னர் வந்த சுருக்கம்");
    expect(calls).toBe(4);
  });

  it("truncates long chapter text in the prompt", async () => {
    const prompts: string[] = [];
    const fake = async (m: { content: string }[]): Promise<string> => {
      prompts.push(m[0]!.content);
      return "ok";
    };
    await generateBookSummaries(fake, [
      { idx: 0, title: "நீளம்", text: "x".repeat(10_000) },
    ]);
    expect(prompts[0]!.length).toBeLessThan(6300);
    expect(prompts[0]).toContain("…");
  });
});

describe("runSummariesJob", () => {
  it("fails cleanly when LLM is not configured", async () => {
    const db = new NodeSqliteDb(new DatabaseSync(":memory:"));
    await migrate(db);
    const store = new MemoryStore();
    await db.run(
      `INSERT INTO books (id, title, language, total_chapters, content_version, status)
       VALUES ('b1', 'நூல்', 'ta', 1, 1, 'published')`,
    );
    await db.run(
      `INSERT INTO chapters (id, book_id, idx, title, word_count, content_key)
       VALUES ('b1:0', 'b1', 0, 'முதல்', 10, 'books/b1/chapters/0.json')`,
    );
    await store.put(
      "books/b1/chapters/0.json",
      JSON.stringify({ title: "முதல்", blocks: [{ t: "p", text: "உரை." }] }),
    );

    await expect(runSummariesJob(db, store, null, "b1")).rejects.toThrow(
      "LLM not configured",
    );
    expect(await store.exists(summariesKey("b1"))).toBe(false);
  });

  it("writes summaries.json and updates books.summary", async () => {
    const db = new NodeSqliteDb(new DatabaseSync(":memory:"));
    await migrate(db);
    const store = new MemoryStore();
    await db.run(
      `INSERT INTO books (id, title, language, total_chapters, content_version, status)
       VALUES ('b1', 'நூல்', 'ta', 1, 1, 'published')`,
    );
    await db.run(
      `INSERT INTO chapters (id, book_id, idx, title, word_count, content_key)
       VALUES ('b1:0', 'b1', 0, 'முதல்', 10, 'books/b1/chapters/0.json')`,
    );
    await store.put(
      "books/b1/chapters/0.json",
      JSON.stringify({
        title: "முதல்",
        blocks: [
          { t: "h", lvl: 1, text: "முதல்" },
          { t: "p", text: "உரை வாக்கியம்." },
          { t: "img", key: "x.png" },
        ],
      }),
    );

    const fakeLlm: LlmConfig = {
      baseUrl: "http://localhost:0",
      apiKey: "k",
      model: "m",
    };
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "சுருக்கம்" } }] }), {
        status: 200,
      })) as typeof fetch;
    try {
      await runSummariesJob(db, store, fakeLlm, "b1");
    } finally {
      globalThis.fetch = original;
    }

    const stored = await store.get(summariesKey("b1"));
    expect(stored).not.toBeNull();
    const summaries = JSON.parse(new TextDecoder().decode(stored!)) as {
      chapterSummaries: { summary: string }[];
      bookSummary: string;
    };
    expect(summaries.chapterSummaries[0]?.summary).toBe("சுருக்கம்");
    expect(summaries.bookSummary).toBe("சுருக்கம்");

    const book = await db.get<{ summary: string | null }>(
      "SELECT summary FROM books WHERE id = 'b1'",
    );
    expect(book?.summary).toBe("சுருக்கம்");
  });
});
