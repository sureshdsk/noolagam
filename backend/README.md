# Noolagam Backend — Local Development

TypeScript implementation of the EPUB pipeline and the `/v1` REST API.
Cloudflare Workers first, but web-standard throughout: the same `src/` runs
under `wrangler dev`, under Node via `cli.ts`, and in `vitest`.

Contract and deployment reference: [`../docs/CONTRACT.md`](../docs/CONTRACT.md).

---

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node | 20+ (24.x tested) | Worker tooling, `cli.ts` uses `node:sqlite` |
| npm | 10+ | — |
| Docker | any | MinIO, the local S3-compatible store |
| Python | 3.10+ | **optional**, only for `nlp/` scripts |

No Cloudflare account is needed for local dev — `wrangler dev` runs the Worker
in miniflare with a local SQLite D1.

## 2. Install

```bash
cd backend
npm install
```

## 3. Object storage (MinIO)

The Worker has **no filesystem adapter** — `worker.ts` throws if `S3_*` is
missing, and every route (including `/v1/health`) returns 500. So bring up MinIO
before `wrangler dev`.

```bash
docker run -d --name noolagam-minio -p 9100:9000 -p 9101:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

docker exec noolagam-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec noolagam-minio mc mb local/noolagam-dev
```

Console at http://localhost:9101 (minioadmin / minioadmin) if you want to poke
at the generated artifacts.

> The `cli.ts` path *does* have a filesystem adapter — it falls back to
> `--out ./out` when `S3_*` is unset. MinIO is only required for the Worker.

## 4. Secrets — `backend/.dev.vars`

`wrangler dev` reads `.dev.vars` (gitignored). Start from `.env.example`:

```bash
cp .env.example .dev.vars
```

Then fill in at minimum:

```ini
ADMIN_API_KEY=dev-admin-key
S3_ENDPOINT=http://localhost:9100
S3_REGION=auto
S3_BUCKET=noolagam-dev
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

Notes:

- `S3_ENDPOINT` is **host only** — no bucket, no trailing slash. `s3.ts` builds
  `${endpoint}/${bucket}/${key}`; a bucket baked into the endpoint
  double-prefixes every key and presigned GETs 404 with nothing obviously wrong.
- `ADMIN_API_KEY` must match what you type into the app's profile screen. The
  Flutter client defaults to `dev-admin-key`, so using that value means zero
  configuration on the client side.
- `AUTH_ENFORCE=false` (the default) makes content routes public;
  `authenticate()` returns a fixed `dev-user` claim.
- `LLM_*` unset ⇒ summary stages are skipped and publishing still succeeds.
- `MAINTENANCE_SKIP=true` disables the cron (`migrate()` + stuck-job reclaim).
  Handy locally to keep logs quiet; **never** set it in a deployed environment.

## 5. Database

`wrangler.jsonc` binds `DB` to a local miniflare SQLite database
(`database_id: "local-dev"` is required by the schema but unused locally).
Apply the DDL once:

```bash
npm run db:schema:local     # wrangler d1 execute DB --local --file=./schema.sql
```

`schema.sql` stays the source of truth for DDL; Drizzle (`src/db/`) provides the
typed query layer on top of it. The cron also calls `migrate()` every 5 minutes,
so a running dev server self-heals — but running the command explicitly is
faster than waiting.

To wipe local state entirely: `rm -rf .wrangler/state` and re-apply the schema.

## 6. Run

```bash
npm run dev                 # wrangler dev → http://localhost:8787
curl localhost:8787/v1/health
# {"status":"ok"}
```

A 500 on `/v1/health` almost always means missing or malformed `S3_*` in
`.dev.vars`.

## 7. Ingest a book

Sample EPUBs live in `../assets/books/` (gitignored — bring your own if the
directory is empty).

### Via the API (exercises the real job path)

```bash
curl -X POST localhost:8787/v1/jobs \
  -H 'x-admin-key: dev-admin-key' \
  -F file=@../assets/books/deiva_yaanai/deiva_yaanai.epub
# → {"id":"...","status":"pending",...}

curl -s localhost:8787/v1/jobs -H 'x-admin-key: dev-admin-key' | jq
curl -s localhost:8787/v1/books | jq
```

The Worker runs the pipeline inline via `waitUntil`, so the POST returns
immediately and the job flips to `succeeded` a moment later. Anything left
`pending` gets reclaimed by the 5-minute cron via lease expiry.

### Via the CLI (no Worker, no MinIO)

```bash
npm run cli -- help
npm run cli -- verify ../assets/books/deiva_yaanai/deiva_yaanai.epub
npm run cli -- process ../assets/books/*.epub --out ./out
npm run cli -- books --db ./out/catalog.db
npm run cli -- summarize ../assets/books/deiva_yaanai/deiva_yaanai.epub   # needs LLM_*
```

Artifacts land in `./out` (or in S3 when `S3_*` is exported into the shell).
This is the fastest loop for iterating on `src/epub/` and `src/pipeline/`.

## 8. Optional: LLM summaries

Any OpenAI-compatible endpoint works (OpenAI, the Gemini compat endpoint, Groq,
Ollama). Add to `.dev.vars`:

```ini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Then trigger the stage as its own job:

```bash
curl -X POST localhost:8787/v1/jobs \
  -H 'x-admin-key: dev-admin-key' -H 'content-type: application/json' \
  -d '{"type":"generate_summaries","book_id":"deiva-yaanai"}'
```

Unconfigured, the job fails with a clear error and the published catalog is
unaffected.

## 9. Quality gates

```bash
npm test                    # vitest — api, epub golden, jobs, jwt, nlp, sigv4, config
npm run typecheck           # tsc across worker, cli and test tsconfigs
npm run lint                # eslint
```

`test/config.test.ts` enforces that the three wrangler configs stay in sync —
wrangler has no `extends`, so shared keys are duplicated by hand and this test
is what stops them from drifting.

## 10. Layout

| Path | Role |
| --- | --- |
| `worker.ts` | Worker entrypoint — `fetch` + `scheduled` (cron) |
| `cli.ts` | Node entrypoint for local pipeline runs |
| `src/http/` | Hono app, `/v1` routes, guards, RFC 7807 problems, rate limit |
| `src/epub/` | EPUB → typed block model, cover extraction, a11y check |
| `src/pipeline/` | `ingest → fix → emit → [llm] → [audio] → publish`, job leases |
| `src/nlp/` | Tamil normalization, tokenization, sentence split, search index |
| `src/storage/` | S3 client (fetch + hand-rolled SigV4), memory + fs adapters |
| `src/db/` | Drizzle schema/tables, `migrate()`, sqlite-proxy vs D1 wiring |
| `src/llm/` | OpenAI-compatible client; stages no-op when unconfigured |
| `nlp/*.py` | Standalone Python experiments (Gemini, gTTS) — not in the hot path |

## 11. Environments

| Config | Worker | D1 | Object store |
| --- | --- | --- | --- |
| `wrangler.jsonc` | `noolagam-api-local` | miniflare local | MinIO `:9100` |
| `wrangler.staging.jsonc` | `noolagam-api-staging` | `noolagam-catalog-staging` | `noolagam-content-staging` |
| `wrangler.production.jsonc` | `noolagam-api` | `noolagam-catalog` | `noolagam-content` |

`wrangler.jsonc` is local-only and never deployed. There is deliberately no bare
`deploy` script — every deploy names its config
(`npm run deploy:staging` / `npm run deploy:prod`). Deployment ordering, secrets
handling and rollback are covered in
[`../docs/CONTRACT.md`](../docs/CONTRACT.md).

## 12. Troubleshooting

| Symptom | Cause |
| --- | --- |
| 500 on every route, `/v1/health` included | `S3_*` missing/invalid in `.dev.vars` |
| Presigned GET 404s, upload looked fine | bucket baked into `S3_ENDPOINT` (host only!) |
| `no such table: books` | `npm run db:schema:local` not run |
| 401 on `/v1/jobs` | `X-Admin-Key` ≠ `ADMIN_API_KEY` in `.dev.vars` |
| Job stuck `pending` | cron disabled via `MAINTENANCE_SKIP`, or the run threw — check `wrangler dev` logs |
| CORS error from Flutter web | see `CORS_ORIGINS`; unset/`*` allows all locally |
