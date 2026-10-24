"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { accounts } from "@/lib/sdk/accounts";

export async function saveSettingsAction(values: Record<string, unknown>) {
  const admin = await assertPermission("platform.settings.manage");
  try {
    await accounts.updateSettings(values);
    await logAction(admin, "accounts.settings.updated", "accounts", { keys: Object.keys(values) });
    revalidatePath("/services/accounts/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to save settings" };
  }
}
