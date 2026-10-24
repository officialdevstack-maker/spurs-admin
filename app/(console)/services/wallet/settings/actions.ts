"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { upsertCredential } from "@/lib/credentials";
import { WALLET_SETTING_TYPES } from "@/lib/wallet-settings";

export async function saveWalletSettingsAction(values: Record<string, boolean | number | string>) {
  const admin = await requireAdmin();
  try {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in WALLET_SETTING_TYPES)) continue;
      const stored = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      await upsertCredential({
        appId: "wallet", key, value: stored, scope: "all", secret: false,
        description: "Wallet platform setting", updatedBy: admin.email,
      });
    }
    await logAction(admin, "wallet.settings.updated", "wallet", { keys: Object.keys(values) });
    revalidatePath("/services/wallet/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to save settings" };
  }
}
