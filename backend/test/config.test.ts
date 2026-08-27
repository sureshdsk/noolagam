import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..");

interface WranglerConfig {
  name: string;
  main: string;
  compatibility_date: string;
  d1_databases: { binding: string; database_name: string; database_id: string }[];
  triggers?: { crons?: string[] };
  vars?: Record<string, string>;
}

/**
 * Read a wrangler.jsonc, stripping `//` line comments so JSON.parse accepts it.
 * Skips `//` inside string literals so URLs in vars survive.
 */
function readJsonc(file: string): WranglerConfig {
  const raw = readFileSync(join(backendDir, file), "utf8");
  const stripped = raw
    .split("\n")
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i - 1] !== "\\") inString = !inString;
        if (!inString && ch === "/" && line[i + 1] === "/") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
  return JSON.parse(stripped) as WranglerConfig;
}

const LOCAL = "wrangler.jsonc";
const STAGING = "wrangler.staging.jsonc";
const PRODUCTION = "wrangler.production.jsonc";
const ALL = [LOCAL, STAGING, PRODUCTION];
const DEPLOYED = [STAGING, PRODUCTION];

describe("wrangler config drift", () => {
  const configs = new Map(ALL.map((f) => [f, readJsonc(f)]));

  // Wrangler config has no `extends`, so the three files duplicate these keys by
  // hand. Drift here means an env silently runs different code or on a different
  // schedule than the one it was tested against.
  it.each(["main", "compatibility_date"] as const)("agrees on %s", (key) => {
    const values = ALL.map((f) => configs.get(f)![key]);
    expect(new Set(values).size).toBe(1);
  });

  it("agrees on the cron schedule", () => {
    const schedules = ALL.map((f) => JSON.stringify(configs.get(f)!.triggers?.crons ?? []));
    expect(new Set(schedules).size).toBe(1);
  });

  it("binds D1 as DB everywhere, since worker.ts reads env.DB", () => {
    for (const file of ALL) {
      const bindings = configs.get(file)!.d1_databases.map((d) => d.binding);
      expect(bindings, file).toEqual(["DB"]);
    }
  });

  // Shared worker names, databases, or buckets would let a staging deploy or a
  // stray migration reach production.
  it.each([
    ["worker name", (c: WranglerConfig) => c.name],
    ["database name", (c: WranglerConfig) => c.d1_databases[0]!.database_name],
    ["database id", (c: WranglerConfig) => c.d1_databases[0]!.database_id],
    ["bucket", (c: WranglerConfig) => c.vars?.S3_BUCKET ?? ""],
  ])("gives each deployed env a distinct %s", (_label, pick) => {
    const values = DEPLOYED.map((f) => pick(configs.get(f)!));
    expect(new Set(values).size).toBe(values.length);
  });

  it("keeps credentials out of vars — they belong in wrangler secret", () => {
    for (const file of ALL) {
      const varNames = Object.keys(configs.get(file)!.vars ?? {});
      expect(varNames.filter((n) => /KEY|SECRET|TOKEN|PASSWORD/i.test(n)), file).toEqual([]);
    }
  });

  it("keeps the bucket out of S3_ENDPOINT, which s3.ts appends separately", () => {
    for (const file of DEPLOYED) {
      const cfg = configs.get(file)!;
      const endpoint = cfg.vars?.S3_ENDPOINT ?? "";
      expect(endpoint, file).not.toMatch(/\/$/);
      expect(new URL(endpoint).pathname, file).toBe("/");
    }
  });
});
