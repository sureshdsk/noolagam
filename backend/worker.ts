import { createApp } from "./src/http/app.js";
import { D1Db, type D1DatabaseLike } from "./src/db/d1.js";
import { S3Store, s3ConfigFromEnv } from "./src/storage/s3.js";
import type { ObjectStore } from "./src/storage/types.js";

export interface Env {
  DB: D1DatabaseLike;
  AUTH_ENFORCE?: string;
  CLERK_JWKS_URL?: string;
  CLERK_ISSUER?: string;
  CLERK_AUDIENCE?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const s3 = s3ConfigFromEnv(env as unknown as Record<string, string | undefined>);
    if (!s3) throw new Error("S3 storage not configured (set S3_* env vars)");
    const store = (): ObjectStore => new S3Store(s3);

    const app = createApp({
      db: () => new D1Db(env.DB),
      store,
      auth: () => ({
        enforce: env.AUTH_ENFORCE === "true",
        jwksUrl: env.CLERK_JWKS_URL,
        issuer: env.CLERK_ISSUER,
        audience: env.CLERK_AUDIENCE,
      }),
    });
    return app.fetch(request);
  },
};
