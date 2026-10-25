"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { createPlan, updatePlan, deletePlan, getPlan, type PlanInput } from "@/lib/plans";
import { setSubscription } from "@/lib/subscriptions";
import { logAction } from "@/lib/audit";

function parse(formData: FormData): PlanInput {
  const priceNgn = Number(formData.get("priceNgn") ?? 0) || 0;
  return {
    appId: String(formData.get("appId") ?? "aitrader").trim() || "aitrader",
    code: String(formData.get("code") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    priceMinorNgn: Math.max(0, Math.round(priceNgn * 100)),
    tradeLimit: Math.max(0, Math.trunc(Number(formData.get("tradeLimit") ?? 0) || 0)),
    tradePeriod: String(formData.get("tradePeriod") ?? "month"),
    features: String(formData.get("features") ?? "").trim(),
    active: String(formData.get("active") ?? "true") === "true",
    isDefault: String(formData.get("isDefault") ?? "false") === "true",
    sortOrder: Math.trunc(Number(formData.get("sortOrder") ?? 0) || 0),
  };
}

export async function createPlanAction(formData: FormData) {
  const admin = await assertPermission("platform.settings.manage");
  const p = parse(formData);
  if (!p.code || !p.name) {
    redirect("/subscriptions/new?error=" + encodeURIComponent("Code and name are required."));
  }
  await createPlan(p);
  await logAction(admin, "plan.create", `${p.appId}:${p.code}`);
  redirect("/subscriptions?saved=1");
}

export async function updatePlanAction(formData: FormData) {
  const admin = await assertPermission("platform.settings.manage");
  const id = String(formData.get("id") ?? "");
  const p = parse(formData);
  if (!id || !p.name) {
    redirect(`/subscriptions/${id}?error=` + encodeURIComponent("Name is required."));
  }
  await updatePlan(id, {
    name: p.name, priceMinorNgn: p.priceMinorNgn, tradeLimit: p.tradeLimit,
    tradePeriod: p.tradePeriod, features: p.features, active: p.active,
    isDefault: p.isDefault, sortOrder: p.sortOrder,
  });
  await logAction(admin, "plan.update", `${p.appId}:${p.code}`);
  redirect("/subscriptions?saved=1");
}

export async function deletePlanAction(formData: FormData) {
  const admin = await assertPermission("platform.settings.manage");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await deletePlan(id);
    await logAction(admin, "plan.delete", id);
  }
  revalidatePath("/subscriptions");
  redirect("/subscriptions?deleted=1");
}

// Manually grant/change a user's plan (a comp, migration, or fix) — no payment.
export async function grantSubscriptionAction(formData: FormData) {
  const admin = await assertPermission("platform.settings.manage");
  const appId = String(formData.get("appId") ?? "aitrader").trim() || "aitrader";
  const userId = String(formData.get("userId") ?? "").trim();
  const planCode = String(formData.get("plan") ?? "").trim();
  const active = String(formData.get("active") ?? "true") === "true";
  const days = Number(formData.get("days") ?? 30) || 30;

  const plan = planCode ? await getPlan(appId, planCode) : null;
  if (!userId || !plan) {
    redirect("/subscriptions/grant?error=" + encodeURIComponent("A user id and a valid plan are required."));
  }

  const renewsAt = active ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  await setSubscription({
    appId, userId, plan: plan.code, active, renewsAt,
    tradeLimit: plan.tradeLimit, tradePeriod: plan.tradePeriod, updatedBy: admin.email,
  });
  await logAction(admin, "subscription.grant", `${appId}:${userId}:${plan.code}`, { active, days });
  redirect("/subscriptions/subscribers?granted=1");
}
