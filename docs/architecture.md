# Noolagam — Architecture

## Principles

1. **Storage is (mostly) the database** — S3-compatible API only (R2 / S3 /
   B2 / MinIO / Wasabi). Heavy artifacts and user state are objects +
   presigned URLs. No proprietary APIs in the hot path.
2. **DB for the relational thin layer** — catalog, annotations, devices,
   jobs. SQLite-first dialect so D1, Postgres, or a SQLite file all work.
3. **Compute is stateless and dumb** — thin API + Python pipeline/scheduler
   as containers; config via env vars (`S3_ENDPOINT`, `DB_URL`,
   `CLERK_ISSUER`, `PUSH_PROVIDER`, …).
4. **Client is local-first** — on-device SQLite (drift) is the source of
   truth; cloud sync is last-write-wins + tombstones. App is fully
   functional offline and signed-out.

## Component map

```
┌─ Flutter app (iOS/Android, web later) ─────────────────────┐
│ drift (SQLite): library, downloads, positions, bookmarks,   │
│ highlights, settings, catalog cache, outbox                 │
│ auth: clerk_auth behind AuthService interface               │
│ push: FCM behind PushService interface                      │
└───────┬────────────────────────────────┬────────────────────┘
        │ HTTPS REST /v1 + presigned    │ FCM v1
        │ Bearer JWT (Clerk)            │
┌───────▼────────────────┐      ┌────────▼─────────┐
│ Object storage (S3 API)│      │ Push (FCM v1 HTTP│
│ incoming/  raw epubs   │      │ behind interface)│
│ books/{id}/… artifacts │      └────────▲─────────┘
│ users/{uid}/state.json │               │
│ config/app.json        │      ┌────────┴─────────┐
└───────▲────────────────┘      │ Tiny DB (SQLite/ │
        │ read/write via API    │ D1/Postgres)     │
┌───────┴───────────────────────────────┐ users, devices, │
│ services/api (FastAPI, stateless)     │ books, chapters,│
│ catalog, presign, sync, push, jobs    │ annotations,    │
│ JWT verify via JWKS (no Clerk SDK)    │ jobs, prefs     │
└───────┬───────────────────────────────└────────▲────────┘
        │ submits jobs / publishes rows            │
┌───────▼──────────────────────┐   ┌───────────────┴─────────────┐
│ services/pipeline (Python)   │   │ services/scheduler (same    │
│ ingest → fix → emit → audio  │   │ image, cron entrypoint)     │
│ → publish → push fan-out     │   │ hourly reminders loop       │
└──────────────────────────────┘   └─────────────────────────────┘
```

## Storage layout

```
incoming/{bookId}/original.epub        # admin uploads (write-restricted)
books/{bookId}/manifest.json           # chapter list, checksums, a11y summary
books/{bookId}/chapters/{n}.json       # block model (below)
books/{bookId}/fixed.epub              # standards-compliant accessible EPUB
books/{bookId}/cover.jpg               # public, rate-limited (browse surface)
books/{bookId}/audio/{n}.m4a           # optional per-chapter TTS audio
books/{bookId}/report.json             # full a11y fix report (write-once)
users/{uid}/state.json                 # positions, settings, per-book prefs
config/app.json                        # feature flags, min version
```

Buckets are **private** with listing disabled; access is exclusively via
API-minted presigned GETs (or the API's own credentials). Separate write path
for `incoming/` (admins only). `users/{uid}/state.json` is written only by
the API on authenticated PUTs — clients never get storage credentials.

### Block model (the accessibility core contract)

Chapter JSON is typed semantic blocks — never raw HTML. This is what makes
TalkBack/VoiceOver work structurally, gives TTS sentence boundaries, and
removes any injected-content attack surface.

```json
{
  "bookId": "…", "chapterIdx": 3, "title": "…", "lang": "ta",
  "contentVersion": 3,
  "blocks": [
    {"t": "h", "lvl": 2, "text": "…"},
    {"t": "p", "text": "…"},
    {"t": "img", "key": "books/x/img/p7.jpg", "alt": "LLM-generated alt"},
    {"t": "table", "header": true, "rows": [["…"]]},
    {"t": "quote", "text": "…", "cite": "…"},
    {"t": "list", "ordered": true, "items": ["…"]}
  ]
}
```

## DB schema (12 tables, SQLite/D1-dialect)

```sql
users(id TEXT PRIMARY KEY, created_at TEXT);
devices(id TEXT PRIMARY KEY, user_id TEXT, fcm_token TEXT, platform TEXT, last_seen TEXT);

books(id TEXT PRIMARY KEY, title TEXT, author TEXT, summary TEXT,
      language TEXT DEFAULT 'ta', cover_key TEXT, manifest_key TEXT,
      total_chapters INTEGER, has_audio INTEGER, a11y_score INTEGER,
      content_version INTEGER, status TEXT, published_at TEXT);
chapters(id TEXT PRIMARY KEY, book_id TEXT, idx INTEGER, title TEXT,
         word_count INTEGER, content_key TEXT, audio_key TEXT, duration_secs INTEGER);

categories(id INTEGER PRIMARY KEY, name_ta TEXT, name_en TEXT);
book_categories(book_id TEXT, category_id INTEGER, PRIMARY KEY (book_id, category_id));

annotations(id TEXT PRIMARY KEY,          -- client-generated UUID
            user_id TEXT, book_id TEXT, chapter_idx INTEGER, block_idx INTEGER,
            char_start INTEGER, char_end INTEGER,
            type TEXT CHECK (type IN ('bookmark','highlight','note')),
            color TEXT, body TEXT,
            created_at TEXT, updated_at TEXT, deleted_at TEXT);  -- tombstone sync
library(user_id TEXT, book_id TEXT, shelf TEXT, added_at TEXT,
        PRIMARY KEY (user_id, book_id, shelf));
topic_subscriptions(user_id TEXT, topic TEXT, created_at TEXT,
                    PRIMARY KEY (user_id, topic));

reading_sessions(id TEXT PRIMARY KEY, user_id TEXT, book_id TEXT,
                 started_at TEXT, ended_at TEXT, seconds INTEGER,
                 source TEXT CHECK (source IN ('read','audio')));
jobs(id TEXT PRIMARY KEY, book_id TEXT, type TEXT, status TEXT, error TEXT,
     lease_expires_at TEXT, created_at TEXT, updated_at TEXT);
notification_prefs(user_id TEXT PRIMARY KEY, reminders_enabled INTEGER,
                   reminder_hour INTEGER,        -- 0–23 local
                   timezone TEXT, last_reminder_sent_at TEXT);
```

**Data placement rules:** DB if relational / queried server-side / written
per-item (catalog, annotations, devices, jobs). Storage if blob / artifact /
hot frequent write (chapter JSON, audio, positions). Device-only if cache or
per-device concern (download registry, drift cache).

**Search:** `LIKE` substring for v1, isolated behind the API search endpoint
so a Postgres deployment can swap in `pg_trgm` or FTS5 later without
touching clients.

## Authentication — Clerk (lock-in contained)

**Client**
- `clerk_auth` Flutter SDK behind the existing `AuthService` interface.
- Web flows via `ASWebAuthenticationSession` / Custom Tabs — no embedded
  WebViews; deep links validated against an allowlist.
- Clerk holds only the publishable key (public by design). No storage or
  service credentials ever ship in the app.
- dio interceptor attaches `Authorization: Bearer <clerk jwt>`, auto-refresh.

**API (portable — no Clerk SDK)**
- Stateless JWT verification: fetch + cache JWKS from `CLERK_JWKS_URL`,
  verify `iss`/`aud`/`exp`; `sub` → `users.id`.
- Lazy provisioning: first authenticated request upserts the user row.
  User identity is always derived from the verified token — never from
  client-supplied IDs.
- Clerk webhooks (signature-verified): `user.deleted` triggers full data
  purge (annotations, library, sessions, prefs, `users/{uid}/` objects, FCM
  tokens) — right-to-erasure by design.
- Swap cost to any OIDC provider = change client SDK + JWKS URL.

**Config:** `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE` (optional),
`CLERK_PUBLISHABLE_KEY` (client).

**Auth boundary:** catalog metadata + covers are public (rate-limited);
**all content access (chapter JSON, audio, fixed EPUB, assets presign)
requires authentication**. Signed-out users can browse but not download.

## REST conventions

- Base `/v1`, plural nouns, no verbs in paths.
- Errors: RFC 7807 `application/problem+json` (`{type, title, status, detail}`).
- Pagination: `?page=&limit=` → `{items, page, total}`; cursor-ready.
- Concurrency: `ETag` / `If-Match` on reading-state PUT; idempotent PATCHes.
- Statuses: `401` unauthenticated, `403` forbidden (admin routes via Clerk
  role/public metadata), `404`, `409`, `429` + `Retry-After`.

## Security model

**App**
- Clerk session in Keychain/Keystore (never `shared_preferences`).
- Reader renders typed block model — no raw HTML, no script surface.
- Optional certificate pinning on API host (with backup pins; rotation
  requires app release — deliberate tradeoff).
- drift DB is device-local and OS-sandboxed; local wipe on logout.
- Dependency hygiene: pinned versions, `pip-audit` / `npm audit` in CI,
  Dependabot.

**API**
- JWT on all `/v1` routes except `/v1/health` and public catalog reads.
- Object-level authorization on every user-scoped route (no IDOR); user_id
  always from token.
- Presign discipline: verify `status='published'` first; scope to exact keys;
  ~15 min read TTL (longer only for active downloads); never write presigns.
- Per-user/IP rate limits, payload size caps, pydantic validation,
  parameterized SQL only, strict CORS, security headers (HSTS, no-sniff,
  frame-deny).
- No tokens/PII in logs.

**Storage**
- Private buckets, listing disabled; presigned GET only.
- `users/{uid}/state.json` written only by the API.

**Not in v1 (deliberate):** root/jailbreak detection, SQLCipher,
`FLAG_SECURE`. Biometric app-lock (`local_auth`) is an open decision,
default defer.

## Push architecture

- `PushProvider` interface, FCM v1 HTTP default (swappable).
- Topic fan-out computed at publish time from `topic_subscriptions` +
  `devices`.
- **Scheduler** (new component): same container image as pipeline, cron
  entrypoint — hourly async loop (no vendor cron triggers → portable).
  Queries `notification_prefs` for due reminders, checks
  `reading_sessions` to skip same-day readers, respects timezone + quiet
  hours, sends via `PushProvider`, caps 1/day, deep-links to last-read
  position. Reads DB only — never trusts client payloads.

## Deployment matrix (same code, env-swapped)

| Component | Cloudflare | Anywhere else |
|---|---|---|
| Storage | R2 | S3 / B2 / MinIO (endpoint swap) |
| Pipeline + Scheduler | Cloudflare Containers | Fly.io / Cloud Run / VPS |
| Thin API | Containers (or Worker rewrite — contract is REST + presign) | Any container host |
| DB | D1 (SQLite dialect) | SQLite file / smallest Postgres |
| Push | FCM v1 over HTTPS from API | Same |
