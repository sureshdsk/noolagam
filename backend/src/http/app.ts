import { Hono } from "hono";
import { cors } from "hono/cors";
import type { OrmDb } from "../db/index.js";
import type { ObjectStore } from "../storage/types.js";
import type { LlmConfig } from "../llm/client.js";
import { bookRoutes } from "./routes/books.js";
import { contentRoutes } from "./routes/content.js";
import { jobsRoutes } from "./routes/jobs.js";
import { reviewRoutes } from "./routes/reviews.js";
import type { AuthDeps } from "./guards.js";
import { problem } from "./problems.js";

export interface AppDeps {
  db: () => OrmDb;
  store: () => ObjectStore;
  auth: () => AuthDeps;
  adminApiKey: () => string | undefined;
  llm: () => LlmConfig | null;
  /** Comma-separated allowed origins for CORS; "*" (default) allows all. */
  corsOrigins?: () => string | undefined;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  const raw = (deps.corsOrigins?.() ?? "*").trim();
  const origins = raw === "" || raw === "*" ? "*" : raw.split(",").map((o) => o.trim()).filter(Boolean);
  app.use("/v1/*", cors({
    origin: origins === "*" ? "*" : origins,
    allowHeaders: ["Authorization", "Content-Type", "X-Admin-Key"],
    maxAge: 86400,
  }));

  app.get("/v1/health", (c) => c.json({ status: "ok" }));

  app.route("/v1/books", bookRoutes(deps.db));
  app.route("/v1/books", contentRoutes(deps.db, deps.store, deps.auth));
  app.route("/v1", reviewRoutes(deps.db, deps.adminApiKey));
  app.route("/v1/jobs", jobsRoutes(deps));

  app.notFound((c) =>
    problem(c, 404, { type: "not_found", title: "Route not found" }),
  );

  app.onError((err, c) => {
    console.error("unhandled error", err);
    return problem(c, 500, { type: "internal", title: "Unexpected error" });
  });

  return app;
}
