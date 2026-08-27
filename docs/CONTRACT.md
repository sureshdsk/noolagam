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
(`npx wrangler d1 execute noolagam-catalog --local --file=schema.sql`), submit a
book (`curl -X POST localhost:8787/v1/jobs -H 'x-admin-key: …' -F
file=@../assets/books/deiva_yaanai/deiva_yaanai.epub`), then browse `/v1/books`.

## Deployment notes

- Worker runs the pipeline inline via `waitUntil` (fine for `wrangler dev` and
  paid Workers; free-tier CPU limits are exceeded by large books — use the CLI,
  a queue, or Containers there). Cron trigger (`*/5 * * * *`) reclaims
  stuck/pending jobs via lease expiry.
- DB: D1 in production (`npx wrangler d1 migrations` / `--file=schema.sql`).
- Storage: any S3 endpoint (R2: `https://<account>.r2.cloudflarestorage.com`,
  region `auto`).
