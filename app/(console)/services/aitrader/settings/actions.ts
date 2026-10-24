"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { upsertCredential } from "@/lib/credentials";
import { logAction } from "@/lib/audit";

// Platform-only "inner settings" — the policy the trader enforces on every user.
// These are NOT broker credentials: users bring their own Bybit/MT5 keys in the
// trader app; admin never holds them. Stored as (non-secret) config for app
// "aitrader"; the service reads them via the spurs-admin SDK (PlatformConfig).
const FIELDS = [
  "AITRADER_ALLOWED_MODES",
  "AITRADER_ALLOW_LIVE",
  "AITRADER_MAX_RISK_PCT",
  "AITRADER_MAX_HEAT_CAP",
  "AITRADER_DEFAULT_MODE",
  "AITRADER_DEFAULT_SYMBOLS",
  "AITRADER_PAPER_SYMBOLS",
  "AITRADER_TRADE_LIMIT_PER_PERIOD",
  "AITRADER_TRADE_LIMIT_PERIOD",
  "AITRADER_DATA_PROVIDER",
  "AITRADER_DATA_PROVIDER_KEY",
  "AITRADER_DATA_PROVIDER_ACCOUNT",
  "AITRADER_DATA_PROVIDER_REGION",
];

export async function savePlatformSettings(formData: FormData) {
  const admin = await requireAdmin();
  const changed: string[] = [];

  // The provider API key is an actual secret and is left blank to keep the
  // existing value — never overwrite it with an empty string.
  const SECRET_KEYS = new Set(["AITRADER_DATA_PROVIDER_KEY"]);

  for (const key of FIELDS) {
    const raw = formData.get(key);
    if (raw === null) continue;
    const value = String(raw).trim();
    if (SECRET_KEYS.has(key) && value === "") continue; // blank = keep current
    await upsertCredential({
      appId: "aitrader",
      key,
      value,
      scope: "all",
      secret: SECRET_KEYS.has(key), // policy is non-secret; the key is a secret
      updatedBy: admin.email,
    });
    changed.push(key);
  }

  if (changed.length) await logAction(admin, "aitrader.platform.update", changed.join(","));
  revalidatePath("/services/aitrader/settings");
  revalidatePath("/services/aitrader");
}
