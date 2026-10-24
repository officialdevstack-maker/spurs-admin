"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { upsertCredential } from "@/lib/credentials";
import { logAction } from "@/lib/audit";

/**
 * Network credentials and the revenue split live here, not in the Earn app's
 * env — admin is the source of truth for every app's configuration, and the
 * Earn app reads these back through its admin-config client.
 */

const APP = "survey";

export async function saveNetworkAction(formData: FormData) {
  const admin = await assertPermission("platform.credentials.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const appId = String(formData.get("appId") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  const enabled = formData.get("enabled") === "on" ? "true" : "false";
  const prefix = `SURVEY_${id.toUpperCase()}`;

  await upsertCredential({
    appId: APP, key: `${prefix}_APP_ID`, value: appId, secret: false,
    description: `${id} app/publisher id`, updatedBy: admin.email,
  });
  // Only overwrite the secret when a new one was actually typed, so saving the
  // form without re-entering it doesn't wipe a working key.
  if (secret) {
    await upsertCredential({
      appId: APP, key: `${prefix}_SECRET`, value: secret, secret: true,
      description: `${id} postback signing secret`, updatedBy: admin.email,
    });
  }
  await upsertCredential({
    appId: APP, key: `${prefix}_ENABLED`, value: enabled, secret: false,
    description: `${id} enabled`, updatedBy: admin.email,
  });

  await logAction(admin, "survey.network_save", `${id} (${enabled === "true" ? "enabled" : "disabled"})`);
  revalidatePath("/services/survey/networks");
}

export async function saveEconomicsAction(formData: FormData) {
  const admin = await assertPermission("platform.settings.manage");

  const entries: [string, string][] = [
    ["SURVEY_REVENUE_SHARE", String(formData.get("revenueShare") ?? "")],
    ["SURVEY_USD_NGN", String(formData.get("usdNgn") ?? "")],
    ["SURVEY_XP_PER_100_NGN", String(formData.get("xpPer100") ?? "")],
    ["SURVEY_HOLD_HOURS", String(formData.get("holdHours") ?? "")],
  ];

  for (const [key, value] of entries) {
    if (!value.trim()) continue;
    await upsertCredential({
      appId: APP, key, value: value.trim(), secret: false,
      description: "Earn economics", updatedBy: admin.email,
    });
  }

  await logAction(admin, "survey.economics_save", entries.map(([k, v]) => `${k}=${v}`).join(", "));
  revalidatePath("/services/survey/networks");
}
