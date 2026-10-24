import "server-only";

/**
 * What the platform runs on a timer.
 *
 * Defined in code because a job only exists if something implements it — a row
 * in a table pointing at nothing would look scheduled and do nothing, which is
 * the exact failure this whole feature exists to prevent. The *schedule*
 * (interval, enabled) is data and tunable in the console.
 *
 * Two kinds of target:
 *   internal — a function in admin. No network, no secret, no timeout risk.
 *   service  — an endpoint in another app, called with the internal secret.
 *
 * Every job must be idempotent and safe to run twice. The scheduler guarantees
 * at-least-once, never exactly-once — overlapping runs and retries are normal.
 */

export interface JobResult {
  /** One line for the console: "3 credited, 0 failed". */
  summary: string;
}

export interface JobDefinition {
  key: string;
  label: string;
  description: string;
  /** Seconds. Overridable per-install from the console. */
  defaultInterval: number;
  run(): Promise<JobResult>;
}

const service = (base: string | undefined, fallback: string, path: string) =>
  `${(base ?? fallback).replace(/\/$/, "")}${path}`;

/** Call another Spurs app's internal endpoint. */
async function callService(url: string, describe: (body: unknown) => string): Promise<JobResult> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("INTERNAL_API_SECRET is not set");

  const res = await fetch(url, {
    method: "POST",
    headers: { "x-internal-secret": secret, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `${new URL(url).host} returned ${res.status}`);
  }
  return { summary: describe(body) };
}

export const JOBS: JobDefinition[] = [
  {
    key: "survey.payouts",
    label: "Release Earn cash-outs",
    description:
      "Credits approved cash-outs whose 24-hour hold has elapsed. Without this, approved payouts sit until someone presses a button in the console.",
    defaultInterval: 300,
    run: () =>
      callService(
        service(process.env.SURVEY_INTERNAL_URL, "http://127.0.0.1:3400", "/api/private/survey/process-payouts"),
        (b) => {
          const r = b as { credited?: number; failed?: number };
          return `${r.credited ?? 0} credited, ${r.failed ?? 0} failed`;
        },
      ),
  },
  {
    key: "giftcards.jobs",
    label: "Process gift card trades",
    description:
      "Runs card verification and settles approved trades. Without this, a sold card is checked and paid only when an agent opens the console.",
    defaultInterval: 120,
    run: () =>
      callService(
        service(process.env.GIFTCARDS_INTERNAL_URL, "http://127.0.0.1:3500", "/api/private/giftcards/process-jobs"),
        (b) => {
          const r = b as { ran?: number; failed?: number };
          return `${r.ran ?? 0} ran, ${r.failed ?? 0} failed`;
        },
      ),
  },
  {
    key: "mail.retry",
    label: "Retry failed email",
    description:
      "Re-sends messages that failed, so a provider outage doesn't silently swallow a password reset or a payslip.",
    defaultInterval: 600,
    run: async () => {
      // In-process: mail lives here, so there's no reason to go over HTTP.
      const { retryFailed } = await import("@/lib/mail/send");
      const r = await retryFailed();
      return { summary: `${r.sent} of ${r.retried} sent` };
    },
  },
];

const BY_KEY = new Map(JOBS.map((j) => [j.key, j]));
export const getJob = (key: string): JobDefinition | null => BY_KEY.get(key) ?? null;
