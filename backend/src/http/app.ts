import { Hono } from "hono";
import { problem } from "./problems.js";

const app = new Hono();

app.get("/v1/health", (c) => c.json({ status: "ok" }));

app.notFound((c) =>
  problem(c, 404, { type: "not_found", title: "Route not found" }),
);

app.onError((err, c) => {
  console.error("unhandled error", err);
  return problem(c, 500, { type: "internal", title: "Unexpected error" });
});

export default app;
