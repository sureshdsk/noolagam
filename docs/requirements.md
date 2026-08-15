# Noolagam — Requirements

## Product vision

A Tamil ebook reader with first-class accessibility and a true offline reading
experience. A separate processing backend ingests EPUBs and **fixes**
accessibility issues before publication. Audiobooks supported via pre-generated
chapter audio with on-device TTS fallback. Push notifications for new books and
reading reminders. Everything deployable on Cloudflare or any platform — no
vendor lock-in.

## Personas

| Persona | Profile | Primary needs |
|---|---|---|
| Meena, 58 | Newly blind | Screen-reader navigation, quality listen, position memory |
| Karthik, 24 | Low vision | 250% font, high contrast, generous spacing, reflow |
| Priya, 31 | Commuter | Offline reading on metro, two-device sync, reminders |
| Arun, 45 | Publisher/admin | Upload EPUBs, monitor processing, see a11y reports |
| Divya, 27 | Signed-out tryer | Browse and evaluate before creating an account |

## User journeys

### J1 — First run, signed out

- Fresh install, no network: **designed empty state** — friendly Tamil copy,
  screen-reader accessible, not an error screen. No bundled sample book.
- With network: browse catalog, search cached catalog, view metadata and a11y
  scores without an account (metadata is public).
- **Downloads require sign-in**: download buttons show "sign-in to download"
  state → inline Clerk sign-in flow → download resumes → pre-login activity
  (library entries, annotations) is claimed via outbox sync on login.
- Logout wipes local data and removes the FCM token.

### J2 — Screen-reader reading (core accessibility journey)

- TalkBack/VoiceOver navigate real structure from the block model: heading
  navigation (rotor), per-element focus, tables with header cells, images
  announcing LLM-generated alt text.
- Switch to listening: pipeline-generated chapter audio (quality tier, hedges
  poor on-device Tamil TTS), lock-screen controls, sleep timer.
- Audio and text positions share one cursor — "continue" resumes the right
  paragraph in either mode.
- `fixed.epub` downloadable as escape hatch for external readers.

### J3 — Low-vision reading

- Font size 100–300%, line-height and letter-spacing controls, 4 themes
  including high-contrast.
- Paginated column reflow at any scale; table blocks scroll horizontally
  instead of breaking layout.
- Preferences persist globally and per-book; sync across devices.

### J4 — Offline-first (stress test)

- On Wi-Fi: download book (chapters + cover + optional audio), Wi-Fi-only by
  default, checksum-verified against manifest, resumable after interruption.
- Airplane mode: full app functionality — reading, cached catalog search,
  annotations, settings.
- Reconnect: annotations sync per-item LWW with tombstones (no silent loss of
  different items); reading-state syncs via ETag'd PUT with max-timestamp
  merge.
- Republished books (`content_version` bump) detected on open; refresh offered.

### J5 — Streaming read (no download)

- Authenticated users read cloud-only books directly; presigned URL map
  fetched in one batch call and cached for the session.

### J6 — Publisher pipeline

- Upload EPUB (admin) → job → ingest → fix → emit → audio → publish →
  push fan-out to topic subscribers.
- Job status observable via API; failures retryable per stage.

### J7 — Signed-out push

- Unavailable (no user row exists). Acceptable for v1; noted in product copy.

### J8 — Reading reminders

- Settings: "வாசிப்பு நினைவூட்டல்" toggle + local-time picker + OS push
  permission prompt.
- Scheduler fires at user's local hour (timezone-aware), max 1/day, skipped if
  the user already read that day (per `reading_sessions`).
- Notification deep-links to last-read book at exact reading position;
  Tamil-localized copy; immediate off-switch in settings.

## Functional requirements

**Catalog** — browse, search (substring v1), categories, book detail with
chapter TOC, summaries, and a11y score; public metadata, authed content.

**Reader** — paginated block-model renderer; semantic structure for
screen readers; bundled Tamil fonts (Noto Sans Tamil / Catamaran — no network
fonts); themes incl. high-contrast; bookmarks, highlights, notes; reading
progress %.

**Audio** — per-chapter pipeline audio with `audio_service` (lock-screen
controls, sleep timer); on-device TTS (`flutter_tts`, `ta-IN`) with
sentence-level karaoke highlighting for unprocessed books.

**Offline** — download manager (resumable, checksummed, storage usage
manager, Wi-Fi-only default); cached catalog; app fully usable in airplane
mode; designed empty states for: no network + empty library, no network +
downloaded books, signed-out, search-no-results.

**Sync** — local SQLite (drift) is source of truth; annotations via outbox +
batch PATCH with tombstones; positions/settings via throttled state PUT.

**Push** — FCM topic subscriptions (category/author), job-complete
notifications, reading reminders (scheduler component).

**Admin** — submit EPUBs for processing, observe job status, a11y report per
book.

## Locked decisions

| Decision | Choice |
|---|---|
| Portability | S3-compatible storage contract, SQLite-first SQL, stateless containers; runs on Cloudflare / Fly / Cloud Run / VPS / MinIO |
| Catalog | DB (books, chapters, categories) |
| Annotations | DB with tombstone sync |
| Reading positions + settings | `state.json` in storage, last-write-wins |
| Artifacts | Object storage only, presigned URLs |
| Auth | Clerk (replaces Firebase Auth); API verifies JWT via JWKS, no Clerk SDK server-side |
| API style | REST, `/v1` prefix, plural nouns, RFC 7807 errors, ETag concurrency |
| Anonymous downloads | **Not allowed** — metadata public, content authenticated |
| Bundled sample book | **No** — designed empty states instead |
| Reading reminders | **Yes, v1** — scheduler container, hourly loop |
| Audiobooks | Pipeline-generated chapter audio + on-device TTS fallback |
| Thin API | FastAPI container |
| Push | FCM v1 HTTP behind `PushProvider` interface |
| Search | `LIKE` substring v1, isolated behind search endpoint |

## Out of scope (v1)

- Transliteration search (exact substring only; noted in UX copy)
- Weekly reading digest (v2; `reading_sessions` groundwork exists)
- FTS5 / `pg_trgm` search upgrade (swap-in later behind API)
- Social features: comments, sharing, recommendations
- Root/jailbreak detection, SQLCipher, `FLAG_SECURE`
- Desktop sign-in (`clerk_auth` covers mobile; browser OAuth if ever needed)
- Biometric app-lock (`local_auth`) — open decision, default defer to v2
