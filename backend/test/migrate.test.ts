import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrate, toExecSql } from "../src/db/migrate.js";
import { SCHEMA_SQL } from "../src/db/schema.js";

/**
 * Stand-in for D1's `exec()`, which is stricter than node:sqlite's: it splits the
 * input on newlines and parses each line as one complete statement. Feeding it
 * SCHEMA_SQL raw produced `D1_EXEC_ERROR: ... incomplete input` in the deployed
 * Worker every cron tick, while every node:sqlite-backed test passed.
 */
class D1StyleExecTarget {
  readonly statements: string[] = [];

  exec(sql: string): void {
    for (const line of sql.split("\n")) {
      if (line.trim().length === 0) continue;
      if (line.trimStart().startsWith("--")) {
        throw new Error(`D1_EXEC_ERROR: Error in line: ${line}: incomplete input`);
      }
      if (!line.trimEnd().endsWith(";")) {
        throw new Error(`D1_EXEC_ERROR: Error in line: ${line}: incomplete input`);
      }
      this.statements.push(line);
    }
  }
}

describe("toExecSql", () => {
  const out = toExecSql(SCHEMA_SQL);

  it("puts every statement on its own single line", () => {
    for (const line of out.split("\n")) {
      expect(line.trim()).not.toBe("");
      expect(line.endsWith(";")).toBe(true);
    }
  });

  it("strips comments, which D1 cannot parse", () => {
    expect(out).not.toContain("--");
  });

  it("preserves quoted literals containing commas and keywords", () => {
    expect(out).toContain("DEFAULT 'ta'");
    expect(out).toContain("IN ('bookmark','highlight','note')");
  });

  it("does not split on a ';' or '--' inside a string literal", () => {
    const sql = "CREATE TABLE t (\n  a TEXT DEFAULT 'x;y',\n  b TEXT DEFAULT 'p--q'\n);";
    expect(toExecSql(sql).split("\n")).toEqual([
      "CREATE TABLE t ( a TEXT DEFAULT 'x;y', b TEXT DEFAULT 'p--q' );",
    ]);
  });

  it("keeps every CREATE statement from the schema", () => {
    const expected = (SCHEMA_SQL.match(/CREATE (TABLE|INDEX)/g) ?? []).length;
    expect(out.split("\n").length).toBe(expected);
  });
});

describe("migrate", () => {
  it("satisfies D1's one-statement-per-line exec contract", async () => {
    const target = new D1StyleExecTarget();
    await expect(migrate(target)).resolves.toBeUndefined();
    expect(target.statements.length).toBeGreaterThan(0);
  });

  it("still builds a working schema on node:sqlite", async () => {
    const sqlite = new DatabaseSync(":memory:");
    await migrate(sqlite);
    const rows = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toContain("books");
    expect(rows.length).toBe(13);
  });

  it("is idempotent", async () => {
    const sqlite = new DatabaseSync(":memory:");
    await migrate(sqlite);
    await expect(migrate(sqlite)).resolves.toBeUndefined();
  });
});
