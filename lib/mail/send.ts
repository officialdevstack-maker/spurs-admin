import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, mailLog, mailSuppressions, type MailLog } from "@/lib/db";
import { getMailSettings } from "./settings";
import { getProvider } from "./providers";
import { render } from "./templates";

/**
 * The one path every Spurs email takes.
 *
 * Order matters and it's deliberate:
 *   1. suppression  — never mail a bounced or opted-out address
 *   2. idempotency  — a retried job must not email someone twice
 *   3. log first    — a row exists before the provider is called, so a crash
 *                     mid-send leaves evidence rather than a silent gap
 *   4. send
 *   5. record the outcome
 *
 * Nothing here throws on a delivery failure: the caller (a signup, a payout)
 * must not fail because an email did. Failures land in the log for the console
 * to show and retry.
 */

export interface SendInput {
  /** Which app asked: accounts | pay | wallet | survey | giftcards | admin */
  app: string;
  template: string;
  to: string;
  context?: Record<string, unknown>;
  /** Caller's key. Sending is idempotent on it. */
  idempotencyKey?: string;
}

export interface SendOutcome {
  id: string | null;
  status: "sent" | "failed" | "suppressed" | "duplicate" | "disabled";
  error?: string;
  providerRef?: string | null;
}

const normalise = (email: string) => email.trim().toLowerCase();

export async function isSuppressed(email: string): Promise<boolean> {
  const [row] = await db.select({ email: mailSuppressions.email })
    .from(mailSuppressions)
    .where(eq(mailSuppressions.email, normalise(email)))
    .limit(1);
  return !!row;
}

export async function suppress(email: string, reason: string, detail?: string): Promise<void> {
  await db.insert(mailSuppressions)
    .values({ email: normalise(email), reason, detail: detail ?? null })
    .onConflictDoNothing();
}

export async function unsuppress(email: string): Promise<void> {
  await db.delete(mailSuppressions).where(eq(mailSuppressions.email, normalise(email)));
}

export async function sendMail(input: SendInput): Promise<SendOutcome> {
  const to = normalise(input.to);
  const context = input.context ?? {};

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { id: null, status: "failed", error: "That doesn't look like an email address" };
  }

  // 1. Suppression. Mailing a hard bounce again is how a sending domain dies.
  if (await isSuppressed(to)) {
    const [row] = await db.insert(mailLog).values({
      app: input.app, template: input.template, to,
      subject: "(suppressed)", status: "suppressed",
      idempotencyKey: input.idempotencyKey ?? null,
      context,
      error: "Address is on the suppression list",
    }).onConflictDoNothing().returning();
    return { id: row?.id ?? null, status: "suppressed" };
  }

  // 2. Idempotency.
  if (input.idempotencyKey) {
    const [existing] = await db.select().from(mailLog)
      .where(eq(mailLog.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      return {
        id: existing.id,
        status: existing.status === "sent" ? "duplicate" : "duplicate",
        providerRef: existing.providerRef,
      };
    }
  }

  const settings = await getMailSettings();

  let rendered;
  try {
    rendered = render(input.template, context, {
      fromName: settings.fromName,
      appUrl: settings.appUrl,
    });
  } catch (e) {
    return { id: null, status: "failed", error: e instanceof Error ? e.message : "Could not render the template" };
  }

  // 3. Log before sending, so a crash mid-send leaves a trace.
  const [entry] = await db.insert(mailLog).values({
    app: input.app,
    template: input.template,
    to,
    subject: rendered.subject,
    status: "queued",
    provider: settings.provider,
    idempotencyKey: input.idempotencyKey ?? null,
    context,
  }).onConflictDoNothing().returning();

  // Lost a race with a concurrent identical send — the other one owns it.
  if (!entry) return { id: null, status: "duplicate" };

  if (!settings.enabled) {
    await db.update(mailLog)
      .set({ status: "failed", error: "Mail is switched off in admin settings" })
      .where(eq(mailLog.id, entry.id));
    return { id: entry.id, status: "disabled", error: "Mail is switched off in admin settings" };
  }

  return deliver(entry, settings);
}

/** Hand a logged message to the provider and record what happened. */
async function deliver(
  entry: MailLog,
  settings: Awaited<ReturnType<typeof getMailSettings>>,
): Promise<SendOutcome> {
  const provider = getProvider(settings.provider);

  // Staging safety valve: send everything to one inbox instead of real people.
  const recipient = settings.redirectTo || entry.to;

  try {
    const rendered = render(entry.template, entry.context, {
      fromName: settings.fromName,
      appUrl: settings.appUrl,
    });

    const result = await provider.send({
      to: recipient,
      from: settings.fromEmail,
      fromName: settings.fromName,
      replyTo: settings.replyTo || undefined,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }, settings.config);

    await db.update(mailLog).set({
      status: "sent",
      provider: provider.id,
      providerRef: result.ref,
      sentAt: new Date(),
      attempts: entry.attempts + 1,
      error: null,
    }).where(eq(mailLog.id, entry.id));

    return { id: entry.id, status: "sent", providerRef: result.ref };
  } catch (e) {
    const error = e instanceof Error ? e.message : "The provider rejected the message";

    await db.update(mailLog).set({
      status: "failed",
      provider: provider.id,
      attempts: entry.attempts + 1,
      error,
    }).where(eq(mailLog.id, entry.id));

    // Deliberately not thrown: a signup must not fail because an email did.
    return { id: entry.id, status: "failed", error };
  }
}

/** Retry a failed message. Used by the console and by any scheduled sweep. */
export async function retry(id: string): Promise<SendOutcome> {
  const [entry] = await db.select().from(mailLog).where(eq(mailLog.id, id)).limit(1);
  if (!entry) return { id: null, status: "failed", error: "Message not found" };
  if (entry.status === "sent") return { id, status: "duplicate" };
  if (await isSuppressed(entry.to)) return { id, status: "suppressed" };

  return deliver(entry, await getMailSettings());
}

/** Retry everything that failed — for a scheduled sweep after an outage. */
export async function retryFailed(limit = 50): Promise<{ retried: number; sent: number }> {
  const failed = await db.select().from(mailLog)
    .where(and(eq(mailLog.status, "failed"), sql`${mailLog.attempts} < 5`))
    .orderBy(desc(mailLog.createdAt))
    .limit(limit);

  let sent = 0;
  for (const entry of failed) {
    const outcome = await retry(entry.id);
    if (outcome.status === "sent") sent++;
  }
  return { retried: failed.length, sent };
}

/* ------------------------------------------------------------------ reads */

export async function recentMail(limit = 100, filter?: { app?: string; status?: string }) {
  const conditions = [
    filter?.app ? eq(mailLog.app, filter.app) : undefined,
    filter?.status ? eq(mailLog.status, filter.status) : undefined,
  ].filter(Boolean);

  return db.select().from(mailLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(mailLog.createdAt))
    .limit(limit);
}

export async function mailStats() {
  const rows = await db
    .select({ status: mailLog.status, count: sql<number>`count(*)::int` })
    .from(mailLog)
    .groupBy(mailLog.status);

  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  const [sup] = await db.select({ count: sql<number>`count(*)::int` }).from(mailSuppressions);

  return {
    sent: by.sent ?? 0,
    failed: by.failed ?? 0,
    queued: by.queued ?? 0,
    suppressed: by.suppressed ?? 0,
    suppressionList: Number(sup.count),
  };
}

export async function listSuppressions(limit = 200) {
  return db.select().from(mailSuppressions)
    .orderBy(desc(mailSuppressions.createdAt))
    .limit(limit);
}
