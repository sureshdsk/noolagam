import { readFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseEpub, type ParsedEpub } from "./src/epub/parse.js";
import { buildArtifacts } from "./src/pipeline/artifacts.js";
import { publishBook, manifestKeyOf } from "./src/pipeline/publish.js";
import { migrate } from "./src/db/migrate.js";
import { FsStore } from "./src/node/fs-store.js";
import { openSqliteDb } from "./src/node/sqlite.js";
import { S3Store, s3ConfigFromEnv } from "./src/storage/s3.js";
import type { ObjectStore } from "./src/storage/types.js";

const usage = `noolagam backend CLI

Usage:
  npm run cli -- <command> [args]

Commands:
  process <epub...> [--out <dir>] [--db <file>]   Parse, write artifacts, publish catalog rows
  verify <epub...>                                Parse and summarize EPUBs without writing
  books [--db <file>]                             List published books from the catalog DB
  help                                            Show this help

Storage: uses S3-compatible storage when S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/
S3_SECRET_ACCESS_KEY are set (see .env.example); otherwise writes to --out (default ./out).
Database: SQLite file at --db (default <out>/catalog.db).
`;

interface Args {
  command: string;
  epubs: string[];
  out: string;
  db: string | null;
}

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const epubs: string[] = [];
  let out = "out";
  let db: string | null = null;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--out") {
      const value = rest[i + 1];
      if (!value) throw new Error("--out requires a directory");
      out = value;
      i++;
    } else if (arg === "--db") {
      const value = rest[i + 1];
      if (!value) throw new Error("--db requires a file path");
      db = value;
      i++;
    } else if (arg !== undefined) {
      epubs.push(arg);
    }
  }
  return { command, epubs, out, db };
}

function bookIdFor(file: string): string {
  const base = file.split("/").pop() ?? file;
  const noExt = base.replace(/\.epub$/i, "");
  const slug = noExt
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "");
  return slug.length > 0 ? slug : "book";
}

async function makeStore(outDir: string): Promise<{ store: ObjectStore; label: string }> {
  const s3 = s3ConfigFromEnv(process.env as Record<string, string | undefined>);
  if (s3) return { store: new S3Store(s3), label: `s3://${s3.bucket}` };
  return { store: new FsStore(outDir), label: `file://${resolve(outDir)}` };
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help") {
    console.log(usage);
    return;
  }

  if (args.command === "verify") {
    if (args.epubs.length === 0) {
      console.error("verify requires at least one epub path");
      process.exitCode = 1;
      return;
    }
    for (const epub of args.epubs) {
      summarize(epub, parseEpub(new Uint8Array(await readFile(resolve(epub))), bookIdFor(epub)));
    }
    return;
  }

  if (args.command === "books") {
    const dbPath = args.db ?? join(args.out, "catalog.db");
    const db = openSqliteDb(dbPath);
    const rows = await db.all<{
      id: string;
      title: string;
      total_chapters: number;
      content_version: number;
      status: string;
      a11y_score: number | null;
    }>(
      "SELECT id, title, total_chapters, content_version, status, a11y_score FROM books ORDER BY id",
    );
    if (rows.length === 0) {
      console.log(`no books in ${dbPath}`);
      return;
    }
    for (const row of rows) {
      console.log(
        `${row.id}  v${row.content_version}  ${row.status}  ${row.total_chapters} ch  a11y=${row.a11y_score}  ${row.title}`,
      );
    }
    return;
  }

  if (args.command !== "process") {
    console.error(`unknown command: ${args.command}`);
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  if (args.epubs.length === 0) {
    console.error("process requires at least one epub path");
    process.exitCode = 1;
    return;
  }

  const { store, label } = await makeStore(args.out);
  const dbPath = args.db ?? join(args.out, "catalog.db");
  await mkdir(dirname(resolve(dbPath)), { recursive: true });
  const db = openSqliteDb(dbPath);
  await migrate(db);

  console.log(`store: ${label}\ndb:    ${resolve(dbPath)}`);
  for (const epub of args.epubs) {
    const parsed = parseEpub(new Uint8Array(await readFile(resolve(epub))), bookIdFor(epub));
    const artifacts = buildArtifacts(parsed);
    const manifestJson = artifacts
      .find((f) => f.path === manifestKeyOf(parsed.bookId))!
      .data as string;
    const previousBytes = await store.get(manifestKeyOf(parsed.bookId));
    const previousManifest = previousBytes
      ? new TextDecoder().decode(previousBytes)
      : null;
    for (const file of artifacts) {
      await store.put(file.path, file.data, {
        contentType: file.path.endsWith(".json") ? "application/json" : undefined,
      });
    }
    const result = await publishBook(db, parsed, manifestJson, previousManifest);
    summarize(epub, parsed);
    console.log(
      `  publish: version ${result.contentVersion}${result.changed ? "" : " (unchanged)"} -> ${dbPath}`,
    );
  }
}

function summarize(epub: string, parsed: ParsedEpub): void {
  const words = parsed.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  console.log(`
${epub}
  title:    ${parsed.metadata.title}
  author:   ${parsed.metadata.author ?? "(unknown)"}
  language: ${parsed.metadata.language}
  chapters: ${parsed.chapters.length} (${words.toLocaleString("en")} words)
  skipped:  ${parsed.skipped.length} ${
    parsed.skipped.length > 0
      ? parsed.skipped.map((s) => `${s.href}: ${s.reason}`).join(", ")
      : ""
  }
  a11y:     score ${parsed.a11y.score}, counts ${JSON.stringify(parsed.a11y.counts)}
  cover:    ${parsed.cover?.path ?? "(none)"}
  first:    ${parsed.chapters[0]?.title ?? "-"}
  last:     ${parsed.chapters[parsed.chapters.length - 1]?.title ?? "-"}`);
}

run().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
