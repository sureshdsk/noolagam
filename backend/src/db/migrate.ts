import { SCHEMA_SQL } from "./schema.js";

export interface ExecTarget {
  exec(sql: string): unknown;
}

/**
 * Split SQL into statements, ignoring `;` and `--` inside single-quoted literals.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    if (inString) {
      current += ch;
      if (ch === "'") inString = sql[i + 1] === "'";
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
    } else if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      current += " ";
    } else if (ch === ";") {
      statements.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  statements.push(current);
  return statements;
}

/**
 * Rewrite schema DDL into the one-statement-per-line form D1's `exec()` requires.
 *
 * D1 splits `exec()` input on newlines and parses each line as a complete
 * statement, so SCHEMA_SQL's leading `--` comments and multi-line `CREATE TABLE`
 * blocks fail with `D1_EXEC_ERROR: ... incomplete input`. node:sqlite's `exec()`
 * accepts the raw text unchanged, which is why this only ever broke in the Worker.
 */
export function toExecSql(sql: string): string {
  return splitStatements(sql)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0)
    .map((s) => `${s};`)
    .join("\n");
}

export async function migrate(target: ExecTarget): Promise<void> {
  await target.exec(toExecSql(SCHEMA_SQL));
}
