import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { OrmDb } from "../db/index.js";
import * as schema from "../db/tables.js";

export interface SqliteHandle {
  sqlite: DatabaseSync;
  db: OrmDb;
}

// node:sqlite (built-in, no native deps) driven through drizzle's
// sqlite-proxy adapter. Async callback flavor matches the awaited-query
// style used across src/ (same as the D1 driver in the worker).
export function openDb(path: string): SqliteHandle {
  const sqlite = new DatabaseSync(path);
  const db = drizzle(
    async (sql, params, method) => {
      const stmt = sqlite.prepare(sql);
      stmt.setReturnArrays(true);
      switch (method) {
        case "run": {
          stmt.run(...params);
          return { rows: [] };
        }
        case "get": {
          // sqlite-proxy contract: for "get", `rows` IS the single positional
          // row (mapResultRow indexes it by column); undefined = no row.
          const row = stmt.get(...params) as unknown;
          return { rows: row as unknown[] };
        }
        default: {
          const rows = stmt.all(...params) as unknown;
          return { rows: rows as unknown[][] };
        }
      }
    },
    { schema },
  ) as unknown as OrmDb;
  return { sqlite, db };
}
