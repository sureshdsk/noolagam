import type { Db } from "../db/types.js";

export interface JobRow {
  id: string;
  book_id: string | null;
  type: string;
  status: string;
  error: string | null;
  lease_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const JOB_TYPES = ["process_epub"] as const;
export type JobType = (typeof JOB_TYPES)[number];

const LEASE_MINUTES = 10;

export function incomingKey(bookId: string): string {
  return `incoming/${bookId}/original.epub`;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function createJob(
  db: Db,
  input: { bookId: string | null; type: JobType },
): Promise<JobRow> {
  const id = newId();
  const now = new Date().toISOString();
  const leaseExpiry = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
  await db.run(
    `INSERT INTO jobs (id, book_id, type, status, error, lease_expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', NULL, ?, ?, ?)`,
    [id, input.bookId, input.type, leaseExpiry, now, now],
  );
  return (await getJob(db, id))!;
}

export async function getJob(db: Db, id: string): Promise<JobRow | null> {
  return db.get<JobRow>(
    "SELECT id, book_id, type, status, error, lease_expires_at, created_at, updated_at FROM jobs WHERE id = ?",
    [id],
  );
}

export async function listJobs(db: Db, status?: string): Promise<JobRow[]> {
  if (status) {
    return db.all<JobRow>(
      "SELECT id, book_id, type, status, error, lease_expires_at, created_at, updated_at FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT 100",
      [status],
    );
  }
  return db.all<JobRow>(
    "SELECT id, book_id, type, status, error, lease_expires_at, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT 100",
  );
}

export async function claimJob(db: Db, id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const leaseExpiry = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
  const job = await getJob(db, id);
  if (!job) return false;
  if (job.status !== "pending" && !(job.status === "running" && job.lease_expires_at !== null && job.lease_expires_at < now)) {
    return false;
  }
  await db.run(
    "UPDATE jobs SET status = 'running', lease_expires_at = ?, updated_at = ? WHERE id = ?",
    [leaseExpiry, now, id],
  );
  return true;
}

export async function completeJob(db: Db, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    "UPDATE jobs SET status = 'completed', error = NULL, lease_expires_at = NULL, updated_at = ? WHERE id = ?",
    [now, id],
  );
}

export async function failJob(db: Db, id: string, error: string): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    "UPDATE jobs SET status = 'failed', error = ?, lease_expires_at = NULL, updated_at = ? WHERE id = ?",
    [error.slice(0, 1000), now, id],
  );
}

export async function dueJobs(db: Db): Promise<JobRow[]> {
  const now = new Date().toISOString();
  return db.all<JobRow>(
    "SELECT id, book_id, type, status, error, lease_expires_at, created_at, updated_at FROM jobs WHERE status = 'pending' OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < ?) ORDER BY created_at LIMIT 5",
    [now],
  );
}

export function serializeJob(job: JobRow) {
  return {
    id: job.id,
    book_id: job.book_id,
    type: job.type,
    status: job.status,
    error: job.error,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}
