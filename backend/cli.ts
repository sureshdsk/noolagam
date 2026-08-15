import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseEpub } from "./src/epub/parse.js";
import { buildArtifacts } from "./src/pipeline/artifacts.js";

const usage = `noolagam backend CLI

Usage:
  npm run cli -- <command> [args]

Commands:
  process <epub...> [--out <dir>]   Parse EPUB(s), write artifacts (default out: ./out)
  verify <epub>                     Parse and summarize an EPUB without writing
  help                              Show this help
`;

interface Args {
  command: string;
  epubs: string[];
  out: string;
}

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const epubs: string[] = [];
  let out = "out";
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--out") {
      const value = rest[i + 1];
      if (!value) throw new Error("--out requires a directory");
      out = value;
      i++;
    } else if (arg !== undefined) {
      epubs.push(arg);
    }
  }
  return { command, epubs, out };
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

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || args.epubs.length === 0) {
    console.log(usage);
    return;
  }

  if (args.command === "verify") {
    for (const epub of args.epubs) {
      const parsed = parseEpub(
        new Uint8Array(await readFile(resolve(epub))),
        bookIdFor(epub),
      );
      summarize(epub, parsed);
    }
    return;
  }

  if (args.command !== "process") {
    console.error(`unknown command: ${args.command}`);
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  for (const epub of args.epubs) {
    const bytes = new Uint8Array(await readFile(resolve(epub)));
    const parsed = parseEpub(bytes, bookIdFor(epub));
    const artifacts = buildArtifacts(parsed);
    for (const file of artifacts) {
      const target = join(args.out, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.data);
    }
    summarize(epub, parsed);
    console.log(`  artifacts: ${artifacts.length} files -> ${join(args.out, "books", parsed.bookId)}`);
  }
}

function summarize(epub: string, parsed: ReturnType<typeof parseEpub>): void {
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
