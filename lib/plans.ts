import { db, plans } from "@/lib/db";
import { and, eq, ne } from "drizzle-orm";

export interface PlanRecord {
  id: string;
  appId: string;
  code: string;
  name: string;
  priceMinorNgn: number;
  tradeLimit: number;
  tradePeriod: string;
  features: string[];
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
}

type Row = typeof plans.$inferSelect;

function toRecord(r: Row): PlanRecord {
  return {
    id: r.id, appId: r.appId, code: r.code, name: r.name,
    priceMinorNgn: r.priceMinorNgn, tradeLimit: r.tradeLimit, tradePeriod: r.tradePeriod,
    features: (r.features ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    active: r.active, isDefault: r.isDefault, sortOrder: r.sortOrder,
  };
}

/** The fallback plan for users with no subscription: the one flagged default,
 *  else "free", else the cheapest. */
export async function getDefaultPlan(appId: string): Promise<PlanRecord | null> {
  try {
    const recs = (await db.select().from(plans).where(eq(plans.appId, appId))).map(toRecord);
    return recs.find((p) => p.isDefault)
      ?? recs.find((p) => p.code === "free")
      ?? recs.sort((a, b) => a.priceMinorNgn - b.priceMinorNgn)[0]
      ?? null;
  } catch {
    return null;
  }
}

/** Make one plan the default for an app (clears the flag on the others). */
export async function setDefaultPlan(appId: string, code: string): Promise<void> {
  await db.update(plans).set({ isDefault: false }).where(and(eq(plans.appId, appId), ne(plans.code, code)));
  await db.update(plans).set({ isDefault: true }).where(and(eq(plans.appId, appId), eq(plans.code, code)));
}

/** All plans (optionally scoped to an app). Fails soft if not migrated. */
export async function listPlans(appId?: string, activeOnly = false): Promise<PlanRecord[]> {
  try {
    const rows = appId
      ? await db.select().from(plans).where(eq(plans.appId, appId))
      : await db.select().from(plans);
    return rows
      .map(toRecord)
      .filter((p) => !activeOnly || p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.priceMinorNgn - b.priceMinorNgn);
  } catch {
    return [];
  }
}

export async function getPlan(appId: string, code: string): Promise<PlanRecord | null> {
  try {
    const [row] = await db.select().from(plans).where(and(eq(plans.appId, appId), eq(plans.code, code))).limit(1);
    return row ? toRecord(row) : null;
  } catch {
    return null;
  }
}

export async function getPlanById(id: string): Promise<PlanRecord | null> {
  try {
    const [row] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return row ? toRecord(row) : null;
  } catch {
    return null;
  }
}

export interface PlanInput {
  appId: string;
  code: string;
  name: string;
  priceMinorNgn: number;
  tradeLimit: number;
  tradePeriod: string;
  features: string;   // raw newline-separated text
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export async function createPlan(input: PlanInput): Promise<void> {
  await db.insert(plans).values({
    appId: input.appId, code: input.code, name: input.name,
    priceMinorNgn: input.priceMinorNgn, tradeLimit: input.tradeLimit, tradePeriod: input.tradePeriod,
    features: input.features, active: input.active, isDefault: input.isDefault, sortOrder: input.sortOrder,
  }).onConflictDoUpdate({
    target: [plans.appId, plans.code],
    set: {
      name: input.name, priceMinorNgn: input.priceMinorNgn, tradeLimit: input.tradeLimit,
      tradePeriod: input.tradePeriod, features: input.features, active: input.active,
      isDefault: input.isDefault, sortOrder: input.sortOrder, updatedAt: new Date(),
    },
  });
  if (input.isDefault) await setDefaultPlan(input.appId, input.code);
}

export async function updatePlan(id: string, input: Omit<PlanInput, "appId" | "code">): Promise<void> {
  await db.update(plans).set({
    name: input.name, priceMinorNgn: input.priceMinorNgn, tradeLimit: input.tradeLimit,
    tradePeriod: input.tradePeriod, features: input.features, active: input.active,
    isDefault: input.isDefault, sortOrder: input.sortOrder, updatedAt: new Date(),
  }).where(eq(plans.id, id));
  if (input.isDefault) {
    const [row] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    if (row) await setDefaultPlan(row.appId, row.code);
  }
}

export async function deletePlan(id: string): Promise<void> {
  await db.delete(plans).where(eq(plans.id, id));
}
