"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { upsertCredential } from "@/lib/credentials";
import { SUITE_SETTING_TYPES, SUITE_SECRET_KEYS } from "@/lib/suite-settings";

export async function saveSuiteSettingsAction(values: Record<string, boolean | number | string>) {
  const admin = await requireAdmin();
  try {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in SUITE_SETTING_TYPES)) continue;
      const secret = SUITE_SECRET_KEYS.has(key);
      const stored = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      // A blank secret means "leave the stored value alone".
      if (secret && stored.trim() === "") continue;
      await upsertCredential({
        appId: "suite", key, value: stored, scope: "all", secret,
        description: "Suite platform setting", updatedBy: admin.email,
      });
    }
    await logAction(admin, "suite.settings.updated", "suite", { keys: Object.keys(values) });
    revalidatePath("/services/suite/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to save settings" };
  }
}
