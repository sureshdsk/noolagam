import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./tables.js";

// Shared ORM database type. Typed as the sync (better-sqlite3-compatible)
// flavor; all shared code awaits queries, which is runtime-compatible with
// async drivers (D1) — the worker casts its D1 instance to this type.
export type OrmDb = BetterSQLite3Database<typeof schema>;

export { schema };
