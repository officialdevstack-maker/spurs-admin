import "server-only";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db, scheduledJobs, schedulerHeartbeat, type ScheduledJob } from "@/lib/db";
import { JOBS, getJob } from "./jobs";

/**
 * The scheduler.
 *
 * One tick drives everything. An external timer (cron, or the worker in
 * `scripts/scheduler.mjs`) calls `tick()` every minute; this decides what's
 * actually due and runs it.
 *
 * Jobs are claimed atomically, so two overlapping ticks — or two app instances
 * — never run the same job twice at once. Every job is idempotent anyway,
 * because at-least-once is the only delivery guarantee worth relying on.
 */

/** Longest a job may run before the next tick may re-claim it. */
const STUCK_AFTER_MS = 10 * 60_000;

/**
 * Make sure every job defined in code has a row.
 *
 * Done once per process rather than on every tick — this is startup
 * reconciliation, and writing three identical upserts every minute for the life
 * of the server is pure noise. A deploy restarts the process, which is exactly
 * when the definitions can have changed.
 */
let synced = false;

export async function syncJobs(force = false): Promise<void> {
  if (synced && !force) return;

  for (const job of JOBS) {
    await db.insert(scheduledJobs).values({
      key: job.key,
      label: job.label,
      description: job.description,
      intervalSeconds: job.defaultInterval,
    }).onConflictDoUpdate({
      target: scheduledJobs.key,
      // Copy stays fresh; the interval and enabled flag belong to the operator.
      set: { label: job.label, description: job.description },
    });
  }
  synced = true;
}

export interface TickResult {
  ran: { key: string; ok: boolean; summary: string; ms: number }[];
  skipped: number;
}

/**
 * Run everything that's due.
 *
 * Failures back off — a service that's down shouldn't be hammered every minute,
 * and a job that's failed ten times in a row is usually broken rather than
 * unlucky. Backoff is capped so a recovered service is picked up promptly.
 */
export async function tick(): Promise<TickResult> {
  await syncJobs();
  await beat();

  const now = new Date();
  const due = await db.select().from(scheduledJobs)
    .where(and(eq(scheduledJobs.enabled, true), lte(scheduledJobs.nextRunAt, now)))
    .orderBy(asc(scheduledJobs.nextRunAt));

  const ran: TickResult["ran"] = [];
  let skipped = 0;

  for (const row of due) {
    // A job stuck in `running` beyond the timeout is assumed dead — a crashed
    // process must not block a job for ever.
    const stale = row.lastRunAt && Date.now() - row.lastRunAt.getTime() > STUCK_AFTER_MS;
    if (row.lastStatus === "running" && !stale) { skipped++; continue; }

    const result = await runJob(row);
    if (result) ran.push(result);
    else skipped++;
  }

  return { ran, skipped };
}

/** Claim and run one job. Returns null if another tick got there first. */
async function runJob(row: ScheduledJob): Promise<TickResult["ran"][number] | null> {
  const job = getJob(row.key);
  if (!job) return null;

  // Atomic claim: only the tick that flips this row to `running` may proceed.
  const [claimed] = await db.update(scheduledJobs)
    .set({ lastStatus: "running", lastRunAt: new Date() })
    .where(and(
      eq(scheduledJobs.id, row.id),
      eq(scheduledJobs.lastStatus, row.lastStatus),
    ))
    .returning();
  if (!claimed) return null;

  const started = Date.now();

  try {
    const result = await job.run();
    const ms = Date.now() - started;

    await db.update(scheduledJobs).set({
      lastStatus: "ok",
      lastError: null,
      lastResult: result.summary,
      lastDurationMs: ms,
      failures: 0,
      runs: row.runs + 1,
      nextRunAt: new Date(Date.now() + row.intervalSeconds * 1000),
    }).where(eq(scheduledJobs.id, row.id));

    return { key: row.key, ok: true, summary: result.summary, ms };
  } catch (e) {
    const ms = Date.now() - started;
    const error = e instanceof Error ? e.message : "Job failed";
    const failures = row.failures + 1;

    // Exponential backoff, capped at 30 minutes so recovery isn't slow.
    const backoff = Math.min(row.intervalSeconds * 2 ** Math.min(failures, 5), 1800);

    await db.update(scheduledJobs).set({
      lastStatus: "failed",
      lastError: error,
      lastDurationMs: ms,
      failures,
      runs: row.runs + 1,
      nextRunAt: new Date(Date.now() + backoff * 1000),
    }).where(eq(scheduledJobs.id, row.id));

    return { key: row.key, ok: false, summary: error, ms };
  }
}

/** Run one job now, ignoring its schedule. Used by the console. */
export async function runNow(key: string): Promise<{ ok: boolean; summary: string }> {
  await syncJobs();
  const [row] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.key, key)).limit(1);
  if (!row) return { ok: false, summary: "No such job" };

  const result = await runJob({ ...row, lastStatus: row.lastStatus });
  return result
    ? { ok: result.ok, summary: result.summary }
    : { ok: false, summary: "That job is already running" };
}

/* -------------------------------------------------------------- heartbeat */

async function beat(): Promise<void> {
  await db.insert(schedulerHeartbeat)
    .values({ id: "singleton", lastTickAt: new Date(), ticks: 1 })
    .onConflictDoUpdate({
      target: schedulerHeartbeat.id,
      set: { lastTickAt: new Date(), ticks: sql`${schedulerHeartbeat.ticks} + 1` },
    });
}

export interface SchedulerHealth {
  lastTickAt: Date | null;
  ticks: number;
  /** Seconds since the last tick. Null when it has never run. */
  secondsSinceTick: number | null;
  /**
   * True when nothing has ticked recently. This is the failure that hides:
   * every job shows green because none of them ran.
   */
  stalled: boolean;
  overdue: number;
  failing: number;
}

export async function health(): Promise<SchedulerHealth> {
  const [beatRow] = await db.select().from(schedulerHeartbeat).limit(1);
  const now = Date.now();

  const seconds = beatRow ? Math.floor((now - beatRow.lastTickAt.getTime()) / 1000) : null;

  const [counts] = await db
    .select({
      overdue: sql<number>`count(*) filter (where ${scheduledJobs.enabled} and ${scheduledJobs.nextRunAt} < now() - interval '5 minutes')::int`,
      failing: sql<number>`count(*) filter (where ${scheduledJobs.failures} > 0)::int`,
    })
    .from(scheduledJobs);

  return {
    lastTickAt: beatRow?.lastTickAt ?? null,
    ticks: beatRow?.ticks ?? 0,
    secondsSinceTick: seconds,
    // Five minutes of silence from a once-a-minute ticker means it's gone.
    stalled: seconds === null || seconds > 300,
    overdue: Number(counts.overdue),
    failing: Number(counts.failing),
  };
}

export async function listJobs(): Promise<ScheduledJob[]> {
  await syncJobs();
  return db.select().from(scheduledJobs).orderBy(asc(scheduledJobs.label));
}

export async function setJobEnabled(key: string, enabled: boolean): Promise<void> {
  await db.update(scheduledJobs)
    .set({ enabled, ...(enabled ? { failures: 0, nextRunAt: new Date() } : {}) })
    .where(eq(scheduledJobs.key, key));
}

export async function setJobInterval(key: string, seconds: number): Promise<void> {
  if (!Number.isInteger(seconds) || seconds < 30) {
    throw new Error("Interval must be at least 30 seconds");
  }
  await db.update(scheduledJobs)
    .set({ intervalSeconds: seconds, nextRunAt: new Date() })
    .where(eq(scheduledJobs.key, key));
}

export { JOBS };
