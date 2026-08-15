import { describe, expect, it } from "vitest";
import app from "../src/http/app.js";

describe("GET /v1/health", () => {
  it("returns ok without touching DB", async () => {
    const res = await app.request("/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  it("returns RFC 7807 problem+json 404", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const body = (await res.json()) as { status: number; title: string };
    expect(body.status).toBe(404);
    expect(body.title).toBe("Route not found");
  });
});
