import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// Drizzle table definitions mirroring ../schema.sql (docs/architecture.md §DB).
// schema.sql remains the DDL source of truth (applied via migrate());
// these definitions drive typed queries in src/.

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  fcmToken: text("fcm_token"),
  platform: text("platform"),
  lastSeen: text("last_seen"),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  summary: text("summary"),
  language: text("language").notNull().default("ta"),
  coverKey: text("cover_key"),
  manifestKey: text("manifest_key"),
  totalChapters: integer("total_chapters").notNull().default(0),
  hasAudio: integer("has_audio").notNull().default(0),
  a11yScore: integer("a11y_score"),
  contentVersion: integer("content_version").notNull().default(1),
  status: text("status").notNull().default("processing"),
  publishedAt: text("published_at"),
});

export const chapters = sqliteTable(
  "chapters",
  {
    id: text("id").primaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    idx: integer("idx").notNull(),
    title: text("title"),
    wordCount: integer("word_count").notNull().default(0),
    contentKey: text("content_key"),
    audioKey: text("audio_key"),
    durationSecs: integer("duration_secs"),
  },
  (t) => [unique("chapters_book_id_idx_unique").on(t.bookId, t.idx)],
);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  nameTa: text("name_ta").notNull(),
  nameEn: text("name_en"),
});

export const bookCategories = sqliteTable(
  "book_categories",
  {
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.categoryId] })],
);

export const annotations = sqliteTable("annotations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id),
  chapterIdx: integer("chapter_idx").notNull(),
  blockIdx: integer("block_idx").notNull(),
  charStart: integer("char_start").notNull(),
  charEnd: integer("char_end").notNull(),
  type: text("type").notNull(),
  color: text("color"),
  body: text("body"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const library = sqliteTable(
  "library",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    shelf: text("shelf").notNull().default("general"),
    addedAt: text("added_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bookId, t.shelf] })],
);

export const topicSubscriptions = sqliteTable(
  "topic_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    topic: text("topic").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topic] })],
);

export const readingSessions = sqliteTable("reading_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  seconds: integer("seconds"),
  source: text("source"),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  bookId: text("book_id"),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  leaseExpiresAt: text("lease_expires_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notificationPrefs = sqliteTable("notification_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  remindersEnabled: integer("reminders_enabled").notNull().default(1),
  reminderHour: integer("reminder_hour"),
  timezone: text("timezone"),
  lastReminderSentAt: text("last_reminder_sent_at"),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating").notNull(),
  reviewText: text("reviestatusw_text"),
  isHidden: integer("ishidden").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

