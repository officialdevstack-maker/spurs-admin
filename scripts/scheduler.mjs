/**
 * The platform scheduler.
 *
 * A tiny long-running process that pokes admin once a minute. Run it under
 * pm2, systemd or Docker:
 *
 *     node scripts/scheduler.mjs
 *
 * It deliberately holds no logic of its own — everything about *what* runs and
 * *how often* lives in admin, visible and editable in the console. This is only
 * the clock, so losing it never loses state: restart it and pending work is
 * picked up on the next tick.
 *
 * A system cron calling the same endpoint every minute works just as well:
 *     * * * * * curl -s -XPOST -H "x-internal-secret: $SECRET" $ADMIN/api/private/scheduler/tick
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Read admin's own .env so the worker needs no separate configuration.
try {
  const env = readFileSync(join(here, "..", ".env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
} catch {
  // Running with real environment variables instead — that's fine.
}

const BASE = (process.env.ADMIN_PUBLIC_URL ?? "http://127.0.0.1:3300").replace(/\/$/, "");
const SECRET = process.env.INTERNAL_API_SECRET;
const EVERY_MS = Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000);

if (!SECRET) {
  console.error("scheduler: INTERNAL_API_SECRET is not set — refusing to start");
  process.exit(1);
}

const stamp = () => new Date().toISOString().slice(11, 19);

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/private/scheduler/tick`, {
      method: "POST",
      headers: { "x-internal-secret": SECRET, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(120_000),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      // Keep it to one line — a screen of SQL every minute buries the signal.
      const why = (body?.error ?? `HTTP ${res.status}`).split("
")[0].slice(0, 200);
      console.error(`${stamp()} tick failed: ${why}`);
      return;
    }

    // Quiet when there's nothing to do — a log full of "0 jobs" hides the
    // lines that matter.
    for (const job of body.ran ?? []) {
      console.log(`${stamp()} ${job.ok ? "ok  " : "FAIL"} ${job.key} — ${job.summary} (${job.ms}ms)`);
    }
  } catch (e) {
    // Admin restarting is normal in development; keep going.
    console.error(`${stamp()} tick error: ${e.message}`);
  }
}

console.log(`scheduler: polling ${BASE} every ${EVERY_MS / 1000}s`);
await tick();
setInterval(tick, EVERY_MS);
