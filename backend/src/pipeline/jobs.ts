import { and, desc, eq, isNotNull, lt, or } from "drizzle-orm";
import type { OrmDb } from "../db/index.js";
import { jobs } from "../db/tables.js";
import type { Job } from "../db/tables.js";

export const JOB_TYPES = ["process_epub", "generate_summaries"] as const;
export type JobType = (typeof JOB_TYPES)[number];

const LEASE_MINUTES = 10;

export function incomingKey(bookId: string): string {
  return `incoming/${bookId}/original.epub`;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function createJob(
  db: OrmDb,
  input: { bookId: string | null; type: JobType },
): Promise<Job> {
  const id = newId();
  const now = new Date().toISOString();
  const leaseExpiresAt = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
  const [row] = await db
    .insert(jobs)
    .values({
      id,
      bookId: input.bookId,
      type: input.type,
      status: "pending",
      error: null,
      leaseExpiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row!;
}

export async function getJob(db: OrmDb, id: string): Promise<Job | null> {
  return (await db.select().from(jobs).where(eq(jobs.id, id)).get()) ?? null;
}

export async function listJobs(db: OrmDb, status?: string): Promise<Job[]> {
  const query = db.select().from(jobs);
  const rows = status
    ? await query.where(eq(jobs.status, status)).orderBy(desc(jobs.createdAt)).limit(100)
    : await query.orderBy(desc(jobs.createdAt)).limit(100);
  return rows;
}

export async function claimJob(db: OrmDb, id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const leaseExpiry = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
  const job = await getJob(db, id);
  if (!job) return false;
  const expired =
    job.status === "running" &&
    job.leaseExpiresAt !== null &&
    job.leaseExpiresAt < now;
  if (job.status !== "pending" && !expired) return false;
  await db
    .update(jobs)
    .set({ status: "running", leaseExpiresAt: leaseExpiry, updatedAt: now })
    .where(eq(jobs.id, id));
  return true;
}

export async function completeJob(db: OrmDb, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(jobs)
    .set({ status: "completed", error: null, leaseExpiresAt: null, updatedAt: now })
    .where(eq(jobs.id, id));
}

export async function failJob(db: OrmDb, id: string, error: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(jobs)
    .set({
      status: "failed",
      error: error.slice(0, 1000),
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(jobs.id, id));
}

export async function dueJobs(db: OrmDb): Promise<Job[]> {
  const now = new Date().toISOString();
  return db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.status, "pending"),
        and(
          eq(jobs.status, "running"),
          isNotNull(jobs.leaseExpiresAt),
          lt(jobs.leaseExpiresAt, now),
        ),
      ),
    )
    .orderBy(jobs.createdAt)
    .limit(5);
}

export function serializeJob(job: Job) {
  return {
    id: job.id,
    book_id: job.bookId,
    type: job.type,
    status: job.status,
    error: job.error,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}
