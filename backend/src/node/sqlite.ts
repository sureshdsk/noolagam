import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Db } from "../db/types.js";

function sqlParams(params: unknown[]): SQLInputValue[] {
  return params.map((p) => p as SQLInputValue);
}

export class NodeSqliteDb implements Db {
  constructor(private readonly db: DatabaseSync) {}

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...sqlParams(params));
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...sqlParams(params));
    return (row as T | undefined) ?? null;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...sqlParams(params)) as T[];
  }
}

export function openSqliteDb(path: string): NodeSqliteDb {
  return new NodeSqliteDb(new DatabaseSync(path));
}
