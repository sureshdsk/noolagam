import type { Db } from "./types.js";

export interface D1Statement {
  bind(...params: unknown[]): D1BoundStatement;
}

export interface D1BoundStatement {
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): D1Statement;
}

export class D1Db implements Db {
  constructor(private readonly d1: D1DatabaseLike) {}

  async exec(sql: string): Promise<void> {
    await this.d1.exec(sql);
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.d1.prepare(sql).bind(...params).run();
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return await this.d1.prepare(sql).bind(...params).first<T>();
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { results } = await this.d1.prepare(sql).bind(...params).all<T>();
    return results;
  }
}
