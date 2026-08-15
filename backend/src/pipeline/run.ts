import { eq } from "drizzle-orm";
import type { OrmDb } from "../db/index.js";
import { chapters } from "../db/tables.js";
import type { ObjectStore } from "../storage/types.js";
import { parseEpub, type ParsedEpub } from "../epub/parse.js";
import { buildArtifacts } from "./artifacts.js";
import { manifestKeyOf, publishBook, updateBookSummary, type PublishResult } from "./publish.js";
import { chatCompletion, type LlmConfig } from "../llm/client.js";
import { generateBookSummaries } from "../llm/summaries.js";

export interface ProcessEpubOutcome {
  parsed: ParsedEpub;
  publish: PublishResult;
  artifactCount: number;
}

function blockTextOf(block: { t: string; [key: string]: unknown }): string {
  switch (block.t) {
    case "h":
    case "p":
    case "quote":
      return String(block.text ?? "");
    case "list":
      return Array.isArray(block.items) ? block.items.join(" ") : "";
    case "table":
      return Array.isArray(block.rows)
        ? block.rows.map((r) => (Array.isArray(r) ? r.join(" ") : "")).join(" ")
        : "";
    default:
      return "";
  }
}

export function summariesKey(bookId: string): string {
  return `books/${bookId}/summaries.json`;
}

export async function runSummariesJob(
  db: OrmDb,
  store: ObjectStore,
  llm: LlmConfig | null,
  bookId: string,
): Promise<void> {
  if (!llm) {
    throw new Error("LLM not configured (set LLM_BASE_URL, LLM_API_KEY, LLM_MODEL)");
  }
  const chapterRows = await db
    .select({ idx: chapters.idx, title: chapters.title, contentKey: chapters.contentKey })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.idx);
  if (chapterRows.length === 0) {
    throw new Error(`book '${bookId}' has no published chapters`);
  }

  const inputs = [];
  for (const row of chapterRows) {
    const bytes = row.contentKey ? await store.get(row.contentKey) : null;
    if (!bytes) throw new Error(`missing chapter artifact: ${row.contentKey}`);
    const chapter = JSON.parse(new TextDecoder().decode(bytes)) as {
      title: string;
      blocks: { t: string; [key: string]: unknown }[];
    };
    const text = chapter.blocks.map(blockTextOf).join(" ");
    inputs.push({ idx: row.idx, title: row.title || chapter.title, text });
  }

  const summaries = await generateBookSummaries(
    (messages) => chatCompletion(llm, messages),
    inputs,
  );
  await store.put(summariesKey(bookId), JSON.stringify(summaries, null, 2), {
    contentType: "application/json",
  });
  await updateBookSummary(db, bookId, summaries.bookSummary);
}

export async function processEpubBook(
  db: OrmDb,
  store: ObjectStore,
  bytes: Uint8Array,
  bookId: string,
): Promise<ProcessEpubOutcome> {
  const parsed = parseEpub(bytes, bookId);
  const artifacts = buildArtifacts(parsed);
  const manifestJson = artifacts.find((f) => f.path === manifestKeyOf(bookId))!
    .data as string;

  const previousBytes = await store.get(manifestKeyOf(bookId));
  const previousManifest = previousBytes
    ? new TextDecoder().decode(previousBytes)
    : null;

  for (const file of artifacts) {
    await store.put(file.path, file.data, {
      contentType: file.path.endsWith(".json") ? "application/json" : undefined,
    });
  }

  return {
    parsed,
    publish: await publishBook(db, parsed, manifestJson, previousManifest),
    artifactCount: artifacts.length,
  };
}
