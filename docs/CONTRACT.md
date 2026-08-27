# Noolagam Backend Contract

TS implementation of the pipeline + API described in
[`architecture.md`](./architecture.md) and [`implementation-plan.md`](./implementation-plan.md).
Runtime: Cloudflare Workers first, no vendor lock-in (web-standard TS; runs on
Node/Bun for local dev and any container host).

## Components

- `worker.ts` — Cloudflare Worker entrypoint (Hono app)
- `cli.ts` — Node entrypoint for local pipeline runs against `../assets/books/*.epub`
- `src/epub/` — EPUB parsing → typed block model, cover, a11y check
- `src/nlp/` — Tamil normalization, tokenization, sentence split, search index
- `src/pipeline/` — stages: `ingest → fix → emit → [llm] → [audio] → publish`
- `src/storage/` — S3-compatible client (fetch + SigV4) + filesystem adapter (dev)
- `src/db/` — Drizzle ORM (typed queries; sqlite-proxy over node:sqlite
  locally, drizzle-orm/d1 in the worker). schema.sql stays the DDL source
- `src/http/` — REST `/v1` routes
- `src/llm/` — optional OpenAI-compatible client; stages no-op when unconfigured

## Storage layout (unchanged from architecture.md)

```
incoming/{bookId}/original.epub
books/{bookId}/manifest.json
books/{bookId}/chapters/{n}.json     # block model
books/{bookId}/fixed.epub
books/{bookId}/cover.jpg
books/{bookId}/audio/{n}.m4a         # optional
books/{bookId}/report.json           # a11y report
books/{bookId}/summaries.json         # optional LLM stage output
users/{uid}/state.json
config/app.json
```

## Block model

Chapter JSON is typed semantic blocks — never raw HTML (see architecture.md):

```json
{
  "bookId": "…", "chapterIdx": 3, "title": "…", "lang": "ta",
  "contentVersion": 1,
  "blocks": [
    {"t": "h", "lvl": 2, "text": "…"},
    {"t": "p", "text": "…"},
    {"t": "img", "key": "books/x/img/p7.jpg", "alt": "…"},
    {"t": "table", "header": true, "rows": [["…"]]},
    {"t": "quote", "text": "…", "cite": "…"},
    {"t": "list", "ordered": true, "items": ["…"]}
  ]
}
```

## Pipeline stages

1. **ingest** — read epub from `incoming/`, validate structure.
2. **fix** — a11y pass. v1: detect (alt text, `lang`, heading hierarchy, table
   headers) → `report.json`. Repair lands later.
3. **emit** — chapter block JSON, cover, manifest, search index.
4. **llm** *(optional)* — chapter + book summaries via OpenAI-compatible API
   (`books/{id}/summaries.json` + `books.summary`). Runs as its own
   `generate_summaries` job; requires `LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`,
   otherwise the job fails with a clear error and publishing is unaffected.
5. **audio** *(optional, later)* — per-chapter TTS.
6. **publish** — upsert `books`/`chapters` rows, `status='published'`,
   bump `content_version`, write `manifest.json`.

## REST API (v1 surface — grows per phase)

| Method & path | Auth | Status |
|---|---|---|
| `GET /v1/health` | public | P0 ✅ |
| `GET /v1/books?q=&category=&page=&limit=` | public | P3 ✅ |
| `GET /v1/books/{bookId}` | public | P3 ✅ |
| `GET /v1/books/{bookId}/chapters` | public | P3 ✅ |
| `GET /v1/books/{bookId}/chapters/{idx}` | user | P3 ✅ |
| `GET /v1/books/{bookId}/assets?type=chapters,audio,cover` | user | P3 ✅ |
| `GET /v1/books/{bookId}/cover` | public, rate-limited, 302 | P3 ✅ |
| `POST /v1/jobs` (multipart `file` for `process_epub`; JSON `{type: "generate_summaries", book_id}` for the optional LLM stage) | admin (`X-Admin-Key`) | P4 ✅ |
| `GET /v1/jobs/{id}` · `GET /v1/jobs?status=` | admin | P4 ✅ |

Errors: RFC 7807 `application/problem+json`. Pagination: `?page=&limit=` →
`{items, page, total}`. Full contract: implementation-plan.md §API contract.

## Environment

See `.env.example`. Dev defaults: filesystem storage adapter, `AUTH_ENFORCE=false`
(admin mutations via `X-Admin-Key`), LLM unset (skipped).

## Local development

```
cd backend
npm install
npm run test        # vitest
npm run typecheck   # tsc, worker + cli configs
npm run lint        # eslint
npm run dev         # wrangler dev → http://localhost:8787/v1/health
npm run cli -- --help
```

Local object storage (optional — wrangler dev needs real S3 endpoints):

```
docker run -d --name noolagam-minio -p 9100:9000 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data
docker exec noolagam-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec noolagam-minio mc mb local/noolagam-dev
```

`backend/.dev.vars` then points `S3_ENDPOINT=http://localhost:9100` (see
`.env.example`). With MinIO up: apply schema
(`npm run db:schema:local`), submit a book (`curl -X POST localhost:8787/v1/jobs
-H 'x-admin-key: …' -F file=@../assets/books/deiva_yaanai/deiva_yaanai.epub`),
then browse `/v1/books`.

## Environments

Three wrangler configs, one per environment. Wrangler config has no `extends`, so
the shared keys are duplicated by hand and `test/config.test.ts` enforces that
they stay in sync.

| Config | Worker | D1 | R2 |
| --- | --- | --- | --- |
| `wrangler.jsonc` (default) | `noolagam-api-local` | miniflare local | MinIO `:9100` via `.dev.vars` |
| `wrangler.staging.jsonc` | `noolagam-api-staging` | `noolagam-catalog-staging` | `noolagam-content-staging` |
| `wrangler.production.jsonc` | `noolagam-api` | `noolagam-catalog` | `noolagam-content` |

`wrangler.jsonc` is local-only and is never deployed. There is deliberately no
bare `deploy` script — every deploy names its config:

```
npm run deploy:staging    # wrangler deploy -c wrangler.staging.jsonc
npm run deploy:prod       # wrangler deploy -c wrangler.production.jsonc
npm run tail:staging      # live logs
```

## Deployment notes

Two properties of `worker.ts` dictate the order of a first deploy:

1. **Missing S3 config is a total outage, not a degraded one.** `handler()` calls
   `makeStore(env)` before `createApp`, so a Worker without `S3_*` returns 500 on
   *every* route, `/v1/health` included. Carry the secrets in the first deploy:
   `wrangler deploy -c <config> --secrets-file <file>` (additive — later deploys
   do not drop omitted secrets).
2. **Cron cannot bootstrap the schema.** `migrate()` runs only from `scheduled`,
   and `scheduled` calls `makeStore` before it — so an unmigrated DB with no S3
   config never self-heals. Apply `schema.sql` to remote D1 first.

First deploy of an environment:

```
npx wrangler login                       # interactive; note the Account ID
npx wrangler d1 create noolagam-catalog  # paste uuid -> database_id in the config
npx wrangler r2 bucket create noolagam-content
# R2 -> Overview -> API Tokens -> Create Account API token (Object Read & Write,
# scoped to the bucket). Wrangler cannot mint S3 API credentials.
npm run db:schema:prod                   # schema.sql -> remote D1
npx wrangler deploy -c wrangler.production.jsonc --secrets-file /path/to/secrets.env
```

Secrets (never `vars`): `ADMIN_API_KEY`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
plus `CLERK_JWKS_URL` / `CLERK_ISSUER` and optionally `LLM_*`. Use a distinct
`ADMIN_API_KEY` and a distinct R2 token per environment; shred the secrets file
afterwards.

- `S3_ENDPOINT` is **host only** — `https://<account>.r2.cloudflarestorage.com`,
  region `auto`, no bucket and no trailing slash. `S3Store.objectUrl` builds
  `${endpoint}/${bucket}/${key}`; a bucket in the endpoint double-prefixes every
  key and presigned GETs 404 with nothing wrong at deploy time.
- Worker runs the pipeline inline via `waitUntil`; `limits.cpu_ms` is raised to
  the paid maximum for it. That cap does not apply to sub-hourly cron
  invocations, which stay at 30s — a book that only completes via the cron retry
  path can still hit `exceededCpu`. Free tier exceeds CPU limits on large books
  entirely; use the CLI, a queue, or Containers there.
- Cron (`*/5 * * * *`) runs `migrate()` and reclaims stuck/pending jobs via lease
  expiry. Never set `MAINTENANCE_SKIP=true` in a deployed environment — it
  disables both.
- `AUTH_ENFORCE` is `"false"` in every config today, so content routes are
  public: `authenticate()` returns a fixed `dev-user` claim. Before flipping it
  to `"true"`, wire a real `AuthService` in the Flutter app (currently
  `NoopAuthService`) and add a JWKS cache — `guards.ts` refetches the key set on
  every authenticated request.
- Browser (Flutter web) clients need CORS in two places: `CORS_ORIGINS` for the
  API, and a CORS policy on the R2 bucket, which the client hits directly with
  presigned URLs. Mobile builds need neither.
- Rollback: `npx wrangler versions list` / `npx wrangler rollback [VERSION_ID]`.
