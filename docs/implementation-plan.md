# Noolagam — Implementation Plan

Companion to `docs/requirements.md` and `docs/architecture.md`. Execute in
milestone order; each milestone is independently verifiable.

## Target repo structure (monorepo)

```
noolagam/
├── apps/mobile/            # Flutter app (moved from repo root)
├── services/api/           # FastAPI: catalog, presign, sync, push, jobs
├── services/pipeline/      # Python worker (evolves backend/nlp/*)
│                           #   + scheduler entrypoint (same image)
├── infra/
│   ├── docker-compose.yml  # MinIO + api + pipeline + scheduler + sqlite volume
│   ├── sql/schema.sql      # 12-table schema (docs/architecture.md)
│   └── .env.example        # S3_*, DB_URL, CLERK_*, PUSH_PROVIDER
└── docs/                   # this documentation
```

Existing code mapping:
- `backend/nlp/*` → `services/pipeline/` (checker becomes fixer)
- `lib/features/home/screens/reader_screen.dart` → replaced by block-model
  paginated reader
- `lib/services/api/*` → rewritten against REST `/v1` + Clerk token
- Firebase bits (`firebase_options.dart`, `firebase.json`,
  `cloud_firestore`/`firebase_auth` deps) → removed
- `assets/books/deiva_yaanai.epub` → pipeline test input only (not bundled)

## Pipeline stages

`ingest → fix → emit → audio (optional) → publish → push`

1. **ingest** — EPUB from `incoming/`, validate structure.
2. **fix** (evolves `accessibility_checker.py` from checker → repairer):
   - vision-LLM alt text for images
   - `lang="ta"` repair on `<html>` and book metadata
   - heading-hierarchy repair (no level jumps)
   - `<th>` injection for headerless tables
   - optional: legacy Tamil encodings (TAM/Tab/Bamini) → Unicode; books
     flagged, not blocked, on failure
3. **emit** — chapter JSON (block model), `fixed.epub`, cover, Gemini
   summaries (existing scripts).
4. **audio** (optional per book) — per-chapter TTS → m4a.
5. **publish** — upsert `books`/`chapters` rows, `status='published'`,
   bump `content_version`, write `manifest.json`.
6. **push** — FCM fan-out from `topic_subscriptions` + `devices` via
   `PushProvider`.

Jobs live in the `jobs` table (lease + heartbeat); per-stage retries.

## API contract (REST /v1)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /v1/health` | public | Liveness (no DB touch) |
| `GET /v1/books?q=&category=&page=&limit=` | public | Catalog list/search |
| `GET /v1/books/{bookId}` | public | Detail + TOC + a11y score |
| `GET /v1/books/{bookId}/chapters` | public | Chapter list from DB |
| `GET /v1/books/{bookId}/chapters/{idx}` | user | Presign/redirect chapter JSON |
| `GET /v1/books/{bookId}/assets?type=chapters,audio,cover` | user | Batch presigned URL map (published only, rate-limited) |
| `GET/PUT /v1/users/me/reading-state` | user | state.json read/write (ETag/If-Match) |
| `GET /v1/users/me/annotations?since=` | user | Changes incl. tombstones |
| `PATCH /v1/users/me/annotations` | user | Idempotent batch upsert |
| `GET /v1/users/me/library` | user | Library list |
| `PUT/DELETE /v1/users/me/library/{bookId}` | user | Add/remove (shelf in body) |
| `GET /v1/users/me/subscriptions` | user | Topic subscriptions |
| `PUT/DELETE /v1/users/me/subscriptions/{topic}` | user | Subscribe/unsubscribe |
| `GET/PUT /v1/users/me/notification-prefs` | user | Reminder settings |
| `POST /v1/users/me/devices` | user | Register FCM token |
| `DELETE /v1/users/me/devices/{deviceId}` | user | Remove device |
| `POST /v1/jobs` | admin | Submit EPUB for processing |
| `GET /v1/jobs/{jobId}` · `GET /v1/jobs?status=` | admin | Job status |

Covers are additionally fetchable anonymously (rate-limited) for signed-out
browse. Errors are RFC 7807 throughout.

## Flutter app structure

```
lib/
├── core/        # theme (bundled Noto Sans Tamil — drop google_fonts),
│                #   storage clients, push, auth interfaces
├── data/        # drift db, repositories, sync engine, download manager
├── domain/      # models, usecases
└── features/    # library, reader, audio, search, settings, downloads
```

- **Reader**: paginated block-model renderer with `Semantics` structure
  (heading navigation, alt text, table headers); fonts bundled; 100–300%
  size, line-height/letter-spacing; 4 themes incl. high-contrast; table
  blocks scroll horizontally; settings persisted (drift), global + per-book.
- **TTS**: `flutter_tts` (`ta-IN`) sentence-karaoke fallback; processed
  books use `just_audio` + `audio_service` (lock-screen, sleep timer,
  position ↔ reading cursor sync).
- **Sync**: annotations outbox → batch PATCH; positions/settings throttled
  PUT with per-book max-timestamp merge.
- **Offline**: download manager (resumable, checksummed, storage manager,
  Wi-Fi-only default); catalog cached in drift; designed empty states.
- **Auth**: Clerk behind `AuthService`; signed-out mode fully browsable;
  first login flushes outbox to claim pre-login activity.

## Local development

`infra/docker-compose.yml`: MinIO (S3) + api + pipeline worker + scheduler
+ SQLite volume. Everything configured via `infra/.env`. Same images deploy
unchanged to Cloudflare (R2 + Containers + D1), Fly, Cloud Run, or a VPS.

## Milestones

### P0 — Foundation
- Repo split (`apps/mobile`, `services/api`, `services/pipeline`, `infra/`)
- `schema.sql` applied; `docs/CONTRACT.md` (storage layout + block model +
  API spec) written
- docker-compose boots MinIO + api + scheduler stub
- Clerk dev instance; JWT verification via JWKS; rate limiting scaffold
- **Acceptance:** `/v1/health` 200; Clerk sign-in on device →
  `GET /v1/users/me/reading-state` → 200 with provisioned user row.

### P1 — Content pipeline + new reader
- Pipeline processes `deiva_yaanai.epub`: fixed EPUB + chapter JSON +
  manifest in storage, DB rows published
- Block-model reader renders downloaded book offline: bundled fonts,
  persisted settings, working Semantics
- Streaming read path (J5) works authenticated
- **Acceptance:** airplane-mode read of a downloaded book; TalkBack heading
  navigation demo.

### P2 — Library, downloads, sync
- Catalog/search/library UI; resumable checksummed downloads; drift schema
- Sync round-trip: annotations + reading-state across two devices
- `content_version` refresh flow; designed empty states
- **Acceptance:** two-device sync test passes; IDOR check (user A cannot
  touch user B's data); anonymous `/assets` request → 401.

### P3 — Audio
- Pipeline chapter audio (m4a); lock-screen controls, sleep timer,
  position ↔ text cursor sync
- On-device TTS karaoke fallback for unprocessed books
- **Acceptance:** listen with screen off; switch audio→text and land on the
  right paragraph.

### P4 — Push + polish
- FCM topics, job-complete notifications
- Reading reminders end-to-end (prefs → scheduler → push → deep link →
  correct reading position)
- TalkBack + VoiceOver audit pass; a11y score surfaced in book details
- **Acceptance:** reminder fires at local hour, skips same-day readers;
  Clerk `user.deleted` webhook purge test.

## Risks

| Risk | Mitigation |
|---|---|
| On-device Tamil TTS quality varies by OEM | Pipeline audio is the quality tier |
| Legacy encodings (TAM/Tab/Bamini) messy | Optional stage; flag books, don't block |
| FTS5 is SQLite-specific | Search isolated behind API endpoint |
| Cert pinning breaks on rotation | Backup pins; deliberate opt-in decision |
| Vision-LLM alt-text cost/quality | Per-book report.json enables human review |
| Streaming latency (per-chapter presign) | Batch presign map cached per session |

## Deferred (v2 candidates)

Weekly reading digest (groundwork: `reading_sessions`), transliteration
search, FTS5/pg_trgm, biometric app-lock, notification center/inbox,
desktop sign-in via browser OAuth.
