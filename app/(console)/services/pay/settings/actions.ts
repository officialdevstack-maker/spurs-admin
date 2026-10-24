"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { upsertCredential } from "@/lib/credentials";
import { PAY_SETTING_TYPES } from "@/lib/pay-settings";

export async function savePaySettingsAction(values: Record<string, boolean | number | string>) {
  const admin = await requireAdmin();
  try {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in PAY_SETTING_TYPES)) continue;
      const stored = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      await upsertCredential({
        appId: "pay", key, value: stored, scope: "all", secret: false,
        description: "Pay platform setting", updatedBy: admin.email,
      });
    }
    await logAction(admin, "pay.settings.updated", "pay", { keys: Object.keys(values) });
    revalidatePath("/services/pay/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to save settings" };
  }
}
