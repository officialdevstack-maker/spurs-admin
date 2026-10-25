"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { setSubscription } from "@/lib/subscriptions";

export async function createSubscription(formData: FormData) {
  const admin = await assertPermission("platform.ai.manage");
  const userId = String(formData.get("userId") ?? "").trim();
  const plan = String(formData.get("plan") ?? "free").trim();
  const active = String(formData.get("active") ?? "") === "true";
  const renewsAtValue = String(formData.get("renewsAt") ?? "").trim();

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const renewsAt = renewsAtValue ? new Date(`${renewsAtValue}T00:00:00Z`) : null;

  await setSubscription({
    appId: "aitrader",
    userId,
    plan,
    active,
    renewsAt: active ? renewsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
    updatedBy: admin.email,
  });

  await logAction(admin, "aitrader.subscription.upsert", `${userId}:${plan}:${active ? "active" : "inactive"}`);

  revalidatePath("/services/aitrader/subscriptions");
  revalidatePath("/services/aitrader");
}
