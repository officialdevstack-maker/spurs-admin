import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("./_shim.cjs");
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}

const { db, scheduledJobs, schedulerHeartbeat } = await import("./lib/db");
const { eq, sql } = await import("drizzle-orm");
const S = await import("./lib/scheduler");

console.log("=== 1. Jobs register themselves from code ===");
const jobs = await S.listJobs();
console.log("  registered:", jobs.map((j) => j.key).join(", "));

console.log("\n=== 2. Health before any tick ===");
const before = await S.health();
console.log("  stalled:", before.stalled, before.stalled ? "(correct — nothing has ticked)" : "");

console.log("\n=== 3. A tick runs what's due ===");
const first = await S.tick();
console.log("  ran:", first.ran.map((r) => `${r.key}=${r.ok ? "ok" : "FAIL"} (${r.summary})`).join(" | "));

console.log("\n=== 4. Immediately ticking again runs nothing (not yet due) ===");
const second = await S.tick();
console.log("  ran:", second.ran.length, second.ran.length === 0 ? "(correct — respects the interval)" : "(BUG)");

console.log("\n=== 5. Heartbeat is alive ===");
const pulse = await S.health();
console.log("  stalled:", pulse.stalled, "| ticks:", pulse.ticks, "| seconds since:", pulse.secondsSinceTick);

console.log("\n=== 6. Failure backs off instead of hammering ===");
const [mail] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.key, "survey.payouts"));
console.log(`  survey.payouts: status=${mail.lastStatus} failures=${mail.failures}`);
if (mail.failures > 0) {
  const wait = Math.round((mail.nextRunAt.getTime() - Date.now()) / 1000);
  console.log(`  backed off ${wait}s (interval is ${mail.intervalSeconds}s) —`,
    wait > mail.intervalSeconds ? "longer than normal, correct" : "no backoff, BUG");
} else {
  console.log("  (succeeded, so no backoff to show)");
}

console.log("\n=== 7. A job already running is not double-claimed ===");
await db.update(scheduledJobs)
  .set({ lastStatus: "running", lastRunAt: new Date(), nextRunAt: new Date(Date.now() - 1000) })
  .where(eq(scheduledJobs.key, "mail.retry"));
const guarded = await S.tick();
console.log("  mail.retry ran:", guarded.ran.some((r) => r.key === "mail.retry") ? "YES — BUG" : "no (skipped)");
console.log("  skipped:", guarded.skipped);

console.log("\n=== 8. A stuck job is eventually reclaimed ===");
await db.update(scheduledJobs)
  .set({ lastStatus: "running", lastRunAt: new Date(Date.now() - 11 * 60_000), nextRunAt: new Date(Date.now() - 1000) })
  .where(eq(scheduledJobs.key, "mail.retry"));
const reclaimed = await S.tick();
console.log("  reclaimed after 11m:",
  reclaimed.ran.some((r) => r.key === "mail.retry") ? "yes (correct)" : "NO — a crash would block it forever");

console.log("\n=== 9. Pausing stops it being due ===");
await S.setJobEnabled("mail.retry", false);
await db.update(scheduledJobs).set({ nextRunAt: new Date(Date.now() - 1000) })
  .where(eq(scheduledJobs.key, "mail.retry"));
const paused = await S.tick();
console.log("  paused job ran:", paused.ran.some((r) => r.key === "mail.retry") ? "YES — BUG" : "no");
await S.setJobEnabled("mail.retry", true);

console.log("\n=== 10. Interval floor is enforced ===");
try {
  await S.setJobInterval("mail.retry", 5);
  console.log("  accepted 5s — BUG");
} catch (e) {
  console.log("  rejected:", (e as Error).message);
}

// Leave the schedule in a sane state.
await db.update(scheduledJobs).set({ nextRunAt: new Date(), failures: 0, lastStatus: "never" });
console.log("\nreset schedule.");
process.exit(0);
