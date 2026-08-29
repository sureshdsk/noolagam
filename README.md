# ஓலைச்சுவடி · Noolagam

**Tamil Literary Heritage** — an accessible Tamil ebook reader and the EPUB
processing backend that feeds it.

A Flutter client (iOS / Android / web) reads a typed *block model* — never raw
HTML — so screen readers get real structure, TTS gets sentence boundaries, and
there is no injected-content attack surface. A Cloudflare Workers backend
ingests EPUBs, runs an accessibility pass, emits chapter blocks, optionally
generates LLM summaries, and publishes the catalog.

---

## Repository layout

```
.
├── lib/                    Flutter app (Dart)
│   ├── core/               config, theme, shared UI primitives
│   ├── features/home/      home · search · library · profile · reader
│   ├── models/             Book, Chapter, Job, Highlight, ReadingProgress
│   ├── services/api/       Dio clients for /v1 (books, admin jobs)
│   └── state/              provider-based app state
├── web/                    Flutter web shell (index.html, manifest, icons)
├── test/                   Flutter widget + unit tests
├── assets/books/           sample EPUBs (*.epub is gitignored)
│
├── backend/                Cloudflare Worker + pipeline (TypeScript)
│   ├── worker.ts           Worker entrypoint (fetch + cron)
│   ├── cli.ts              Node entrypoint for local pipeline runs
│   ├── src/epub|nlp|pipeline|storage|db|http|llm
│   ├── nlp/                standalone Python experiments (not in the hot path)
│   ├── schema.sql          DDL source of truth
│   └── wrangler*.jsonc     local · staging · production configs
│
├── docs/                   requirements, architecture, contract, plan
├── wrangler.web.jsonc      assets-only Worker that serves build/web
└── package.json            Flutter web build + deploy scripts
```

## Architecture at a glance

```
Flutter app ──HTTPS /v1──▶ Worker (Hono)  ──▶ D1 (catalog, chapters, jobs)
     │                          │
     │                          └──▶ R2 / S3 / MinIO  (epubs, block JSON,
     └──presigned GET───────────────▶                  covers, audio, reports)
```

- **Storage is mostly the database.** Heavy artifacts live behind the S3 API and
  are served via API-minted presigned URLs. Buckets are private.
- **The relational layer is thin.** SQLite-dialect DDL, so D1, Postgres or a
  plain SQLite file all work.
- **Compute is stateless.** All configuration arrives as env vars / secrets.
- **No vendor lock-in.** Web-standard TypeScript; the same code runs under
  `wrangler dev`, Node (`cli.ts`), or any container host.

Pipeline stages: `ingest → fix (a11y) → emit (blocks) → [llm] → [audio] → publish`.

Deeper reading:

| Doc | What's in it |
| --- | --- |
| [`docs/requirements.md`](docs/requirements.md) | Product vision, personas, user journeys |
| [`docs/architecture.md`](docs/architecture.md) | Component map, storage layout, block model, DB schema |
| [`docs/CONTRACT.md`](docs/CONTRACT.md) | REST `/v1` surface, environments, deployment notes |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Phased delivery plan |

## The `/v1` API

| Method & path | Auth |
| --- | --- |
| `GET /v1/health` | public |
| `GET /v1/books?q=&category=&page=&limit=` | public |
| `GET /v1/books/{bookId}` | public |
| `GET /v1/books/{bookId}/chapters` | public |
| `GET /v1/books/{bookId}/chapters/{idx}` | user |
| `GET /v1/books/{bookId}/assets?type=chapters,audio,cover` | user |
| `GET /v1/books/{bookId}/cover` | public, rate-limited |
| `POST /v1/jobs` · `GET /v1/jobs/{id}` · `GET /v1/jobs?status=` | admin (`X-Admin-Key`) |

Errors are RFC 7807 `application/problem+json`. Lists paginate as
`{items, page, total}`.

> `AUTH_ENFORCE` is `"false"` in every environment today, so "user" routes are
> effectively public and `authenticate()` returns a fixed `dev-user` claim.

## Getting started

Two independent dev loops — start the backend first, the app talks to it.

1. **Backend** → [`backend/README.md`](backend/README.md)
   `cd backend && npm install && npm run dev` → http://localhost:8787/v1/health
2. **Flutter app / web** → [`README.frontend.md`](README.frontend.md)
   `flutter pub get && flutter run -d chrome --web-port 8080`

Prerequisites: Flutter 3.41+ (Dart 3.11+), Node 20+ (24 tested), Docker for a
local MinIO, and Python 3.10+ only if you want the `backend/nlp/` scripts.

## Deploying

```bash
# API
cd backend
npm run deploy:staging       # wrangler deploy -c wrangler.staging.jsonc
npm run deploy:prod          # wrangler deploy -c wrangler.production.jsonc
npm run tail:staging         # live logs

# Flutter web (from the repo root)
npm run deploy:web           # build --release with the staging API baked in, then deploy
```

First deploy of an environment has ordering constraints — a Worker without
`S3_*` returns 500 on *every* route including `/v1/health`, and cron cannot
bootstrap the schema. Follow
[`docs/CONTRACT.md` § Deployment notes](docs/CONTRACT.md) exactly.

## Tests

```bash
flutter test                 # app
cd backend && npm test       # vitest
cd backend && npm run typecheck && npm run lint
```

## License

Private project — `publish_to: none`. Not for redistribution.
