import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { createApp } from "./src/http/app.js";
import type { OrmDb } from "./src/db/index.js";
import * as schema from "./src/db/tables.js";
import { migrate } from "./src/db/migrate.js";
import { S3Store, s3ConfigFromEnv } from "./src/storage/s3.js";
import type { ObjectStore } from "./src/storage/types.js";
import { llmConfigFromEnv } from "./src/llm/client.js";
import { dueJobs } from "./src/pipeline/jobs.js";
import { executeJob } from "./src/http/routes/jobs.js";

export interface Env {
  DB: D1Database;
  AUTH_ENFORCE?: string;
  CLERK_JWKS_URL?: string;
  CLERK_ISSUER?: string;
  CLERK_AUDIENCE?: string;
  ADMIN_API_KEY?: string;
  MAINTENANCE_SKIP?: string;
  LLM_BASE_URL?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
}

function makeStore(env: Env): () => ObjectStore {
  const s3 = s3ConfigFromEnv(env as unknown as Record<string, string | undefined>);
  if (!s3) throw new Error("S3 storage not configured (set S3_* env vars or secrets)");
  return () => new S3Store(s3);
}

function makeDb(env: Env): OrmDb {
  // D1's async drizzle instance is runtime-compatible with the awaited-query
  // style used across src/ (all queries are awaited); cast to the shared
  // sync-flavored type.
  return drizzle(env.DB, { schema }) as unknown as OrmDb;
}

function handler(env: Env) {
  const store = makeStore(env);
  const db = makeDb(env);
  const llm = () => llmConfigFromEnv(env as unknown as Record<string, string | undefined>);
  return createApp({
    db: () => db,
    store,
    auth: () => ({
      enforce: env.AUTH_ENFORCE === "true",
      jwksUrl: env.CLERK_JWKS_URL,
      issuer: env.CLERK_ISSUER,
      audience: env.CLERK_AUDIENCE,
    }),
    adminApiKey: () => env.ADMIN_API_KEY,
    llm,
  });
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    return handler(env).fetch(request);
  },

  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    if (env.MAINTENANCE_SKIP === "true") return;
    const db = makeDb(env);
    const store = makeStore(env);
    const llm = () => llmConfigFromEnv(env as unknown as Record<string, string | undefined>);
    const work = (async () => {
      await migrate(env.DB);
      for (const job of await dueJobs(db)) {
        if (!job.bookId) continue;
        await executeJob(db, store(), job.id, null, llm);
      }
    })();
    ctx.waitUntil(work);
  },
};
