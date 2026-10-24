import { db, subscriptions } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { getDefaultPlan } from "@/lib/plans";

export interface SubscriptionView {
  plan: string;
  active: boolean;
  renewsAt: string | null;
  tradeLimit: number;
  tradePeriod: string;
}

export interface SubscriptionRow {
  appId: string;
  userId: string;
  plan: string;
  active: boolean;
  renewsAt: string | null;
  tradeLimit: number;
  tradePeriod: string;
  updatedAt: string;
}

/** All subscriptions (optionally scoped to one app), newest first. Fails soft to
 *  an empty list if the table isn't migrated yet (run `node scripts/push.mjs`). */
export async function listSubscriptions(appId?: string): Promise<SubscriptionRow[]> {
  try {
    const rows = appId
      ? await db.select().from(subscriptions).where(eq(subscriptions.appId, appId))
      : await db.select().from(subscriptions);
    return rows
      .map((r) => ({
        appId: r.appId, userId: r.userId, plan: r.plan, active: r.active,
        renewsAt: r.renewsAt?.toISOString() ?? null,
        tradeLimit: r.tradeLimit ?? 0, tradePeriod: r.tradePeriod ?? "month",
        updatedAt: r.updatedAt.toISOString(),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

/** The user's effective plan. No/lapsed subscription reads as the app's "free"
 *  plan (its limits come from the DB, not code). */
export async function getSubscription(appId: string, userId: string): Promise<SubscriptionView> {
  const def = await getDefaultPlan(appId);
  const asFree: SubscriptionView = {
    plan: def?.code ?? "free", active: false, renewsAt: null,
    tradeLimit: def?.tradeLimit ?? 0, tradePeriod: def?.tradePeriod ?? "month",
  };
  try {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.appId, appId), eq(subscriptions.userId, userId)))
      .limit(1);
    if (!row) return asFree;
    const active = row.active && (!row.renewsAt || row.renewsAt.getTime() > Date.now());
    if (!active) return asFree;
    return {
      plan: row.plan, active,
      renewsAt: row.renewsAt?.toISOString() ?? null,
      tradeLimit: row.tradeLimit ?? 0, tradePeriod: row.tradePeriod ?? "month",
    };
  } catch {
    return asFree;
  }
}

export async function setSubscription(input: {
  appId: string;
  userId: string;
  plan: string;
  active: boolean;
  renewsAt?: Date | null;
  tradeLimit?: number;
  tradePeriod?: string;
  updatedBy?: string;
}): Promise<void> {
  const tradeLimit = Math.max(0, Math.trunc(input.tradeLimit ?? 0));
  const tradePeriod = input.tradePeriod ?? "month";
  await db
    .insert(subscriptions)
    .values({
      appId: input.appId, userId: input.userId, plan: input.plan, active: input.active,
      renewsAt: input.renewsAt ?? null, tradeLimit, tradePeriod, updatedBy: input.updatedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [subscriptions.appId, subscriptions.userId],
      set: {
        plan: input.plan, active: input.active, renewsAt: input.renewsAt ?? null,
        tradeLimit, tradePeriod, updatedBy: input.updatedBy ?? null, updatedAt: new Date(),
      },
    });
}
