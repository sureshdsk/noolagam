# ஓலைச்சுவடி Flutter App — Local Development

The Noolagam client. One Dart codebase targets **web**, iOS, Android, macOS,
Linux and Windows; web is the primary development and deployment target today.

Backend setup lives in [`backend/README.md`](backend/README.md) — start it
first, the app is useless without it.

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Flutter | 3.41+ (stable) |
| Dart | 3.11+ (ships with Flutter) |
| Chrome | for `-d chrome` |
| Node | 20+, only for `npm run serve` / `deploy:web` |

```bash
flutter --version
flutter doctor          # web target must be enabled
```

## 2. Install

```bash
flutter pub get
```

## 3. Run on web

The backend must already be up on `http://localhost:8787`.

```bash
flutter run -d chrome --web-port 8080
```

Pin `--web-port` — Flutter otherwise picks a random port each run, which makes
any CORS allowlist on the API a moving target. Locally `CORS_ORIGINS` is unset
(⇒ `*`), so a random port works too, but 8080 matches what the production config
allowlists.

Hot reload (`r`) and hot restart (`R`) work in the terminal running the command.

### Pointing at a different API

`lib/core/config.dart` resolves the base URL in this order:

1. `--dart-define=API_BASE_URL=...` if provided
2. `http://10.0.2.2:8787/v1` on Android (emulator → host machine)
3. `http://localhost:8787/v1` everywhere else

```bash
# staging API from a local web build
flutter run -d chrome --web-port 8080 \
  --dart-define=API_BASE_URL=https://noolagam-api-staging.sureshdsk.workers.dev/v1

# a backend on your LAN, from a physical device
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8787/v1
```

`--dart-define` values are compiled in — changing one needs a full restart, not
a hot reload.

## 4. Run on other platforms

```bash
flutter devices
flutter run -d macos
flutter run -d <android-emulator-id>     # base URL auto-resolves to 10.0.2.2
flutter run -d <ios-simulator-id>
```

Mobile builds need no CORS configuration at all — that concern is web-only.

## 5. Uploading a book from the app

The profile tab (சுயவிவரம்) has an admin section:

1. Enter the admin key — it must match `ADMIN_API_KEY` in `backend/.dev.vars`.
   The field defaults to `dev-admin-key`, so matching that value in `.dev.vars`
   means nothing to configure here.
2. Pick an EPUB (`file_picker`) and upload. It `POST`s multipart to `/v1/jobs`
   with an `X-Admin-Key` header.
3. `JobsProvider` polls the job until it succeeds, then refreshes the catalog.

The key is persisted in `shared_preferences` — i.e. `localStorage` on web. Treat
it as a dev convenience, not a security boundary.

## 6. Building for web

```bash
npm run build              # flutter build web --release  → build/web
npm run build:staging      # same, with the staging API baked in via --dart-define
npm run serve              # serve build/web on :8080
npm run start              # build + serve
npm run deploy:web         # build:staging, then wrangler deploy -c wrangler.web.jsonc
```

`wrangler.web.jsonc` is an **assets-only** Worker (no `main`): it uploads
`build/web` and serves it with `not_found_handling: single-page-application`, so
deep links and hard refreshes return `index.html` instead of 404.

Note that `build:staging` passes `--no-web-resources-cdn`, which vendors
CanvasKit and friends into the bundle rather than pulling them from
`gstatic.com` — a bigger upload, but no third-party runtime dependency.

## 7. Project layout

```
lib/
├── main.dart                    provider wiring, web context-menu fix
├── app.dart                     MaterialApp, theme, splash entry
├── core/
│   ├── config.dart              API base URL resolution
│   ├── theme/                   colors, app theme, reader palettes
│   └── ui/                      animations, page transitions, skeletons
├── features/
│   ├── splash/
│   └── home/
│       ├── screens/             home · search · library · profile
│       │                        · book details · reader
│       ├── reader/paginator.dart  block-model → paged layout
│       └── widgets/             book card, chapter tile, reader toolbar,
│                                progress bar, quote card, block views
├── models/                      Book, Chapter, Job, Highlight, ReadingProgress
├── services/
│   ├── api/                     ApiClient (Dio), BookService, AdminService
│   └── auth/                    AuthService interface (NoopAuthService today)
└── state/                       catalog, highlights, jobs, reader prefs,
                                 reading progress (ChangeNotifier + provider)
web/                             index.html, manifest.json, icons, favicon
test/                            widget and unit tests
```

State management is `provider` / `ChangeNotifier`. Local persistence is
`shared_preferences`. HTTP is `dio`. Fonts come from `google_fonts`.

## 8. How the reader gets content

1. `BookService` calls `/v1/books` and `/v1/books/{id}/chapters`.
2. Chapter fetch returns a **presigned URL** to chapter JSON in object storage;
   the browser fetches that object directly.
3. The JSON is the typed block model (`h`, `p`, `img`, `table`, `quote`,
   `list`) — never raw HTML. `block_view.dart` renders each type into real
   semantic widgets, which is what makes screen-reader navigation work.
4. `paginator.dart` lays blocks out into pages against the current font size and
   viewport; reader preferences and reading position persist locally.

Because step 2 is a direct browser→storage request, the **bucket** needs its own
CORS policy on top of the API's — see `r2-cors.json` at the repo root. MinIO
allows all origins by default, so local dev needs nothing.

## 9. Tests and analysis

```bash
flutter test                          # all
flutter test test/paginator_test.dart # one file
flutter analyze                       # lints from analysis_options.yaml
dart format lib test
```

Current coverage: highlights, models, paginator, profile highlights, reader
pagination, touch highlighting, plus the default widget smoke test.

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `சேவையகத்தை அடைய முடியவில்லை` | backend isn't running — `cd backend && npm run dev` |
| Empty catalog, no error | backend is up but has no published books — upload an EPUB (§5) |
| CORS error in the browser console | check `CORS_ORIGINS` on the API; for chapter/asset fetches check the bucket's own CORS policy |
| Covers load but chapters don't | bucket CORS — covers proxy through the Worker, chapters are fetched direct |
| `--dart-define` change had no effect | full restart required; hot reload won't pick it up |
| Selection toolbar missing on web | `main.dart` disables the native context menu for exactly this reason — check it still runs |
| Stale build output | `flutter clean && flutter pub get` |
