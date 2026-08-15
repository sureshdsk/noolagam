import { Hono } from "hono";
import type { Db } from "../db/types.js";
import type { ObjectStore } from "../storage/types.js";
import { bookRoutes } from "./routes/books.js";
import { contentRoutes } from "./routes/content.js";
import type { AuthDeps } from "./guards.js";
import { problem } from "./problems.js";

export interface AppDeps {
  db: () => Db;
  store: () => ObjectStore;
  auth: () => AuthDeps;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.get("/v1/health", (c) => c.json({ status: "ok" }));

  app.route("/v1/books", bookRoutes(deps.db));
  app.route("/v1/books", contentRoutes(deps.db, deps.store, deps.auth));

  app.notFound((c) =>
    problem(c, 404, { type: "not_found", title: "Route not found" }),
  );

  app.onError((err, c) => {
    console.error("unhandled error", err);
    return problem(c, 500, { type: "internal", title: "Unexpected error" });
  });

  return app;
}
