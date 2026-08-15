export const SCHEMA_SQL = `-- Noolagam relational layer — SQLite dialect (D1 / SQLite file / Postgres-compatible subset).
-- Mirrors docs/architecture.md §DB schema. Heavy artifacts live in object storage, not here.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  fcm_token TEXT,
  platform TEXT,
  last_seen TEXT
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  summary TEXT,
  language TEXT NOT NULL DEFAULT 'ta',
  cover_key TEXT,
  manifest_key TEXT,
  total_chapters INTEGER NOT NULL DEFAULT 0,
  has_audio INTEGER NOT NULL DEFAULT 0,
  a11y_score INTEGER,
  content_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'processing',
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id),
  idx INTEGER NOT NULL,
  title TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  content_key TEXT,
  audio_key TEXT,
  duration_secs INTEGER,
  UNIQUE (book_id, idx)
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name_ta TEXT NOT NULL,
  name_en TEXT
);

CREATE TABLE IF NOT EXISTS book_categories (
  book_id TEXT NOT NULL REFERENCES books(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  PRIMARY KEY (book_id, category_id)
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,              -- client-generated UUID
  user_id TEXT NOT NULL REFERENCES users(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  chapter_idx INTEGER NOT NULL,
  block_idx INTEGER NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bookmark','highlight','note')),
  color TEXT,
  body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT                   -- tombstone sync
);

CREATE TABLE IF NOT EXISTS library (
  user_id TEXT NOT NULL REFERENCES users(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  shelf TEXT NOT NULL DEFAULT 'general',
  added_at TEXT NOT NULL,
  PRIMARY KEY (user_id, book_id, shelf)
);

CREATE TABLE IF NOT EXISTS topic_subscriptions (
  user_id TEXT NOT NULL REFERENCES users(id),
  topic TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, topic)
);

CREATE TABLE IF NOT EXISTS reading_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  started_at TEXT,
  ended_at TEXT,
  seconds INTEGER,
  source TEXT CHECK (source IN ('read','audio'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  book_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  reminders_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_hour INTEGER,            -- 0–23 local
  timezone TEXT,
  last_reminder_sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, idx);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_annotations_user_book ON annotations(user_id, book_id, updated_at);`;
