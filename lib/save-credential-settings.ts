import "server-only";
import { revalidatePath } from "next/cache";
import type { AdminSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { upsertCredential } from "@/lib/credentials";

export async function saveCredentialSettings({
  admin,
  appId,
  settingTypes,
  secretKeys,
  values,
  description,
  action,
  target,
  path,
}: {
  admin: AdminSession;
  appId: string;
  settingTypes: Record<string, string>;
  secretKeys?: ReadonlySet<string>;
  values: Record<string, boolean | number | string>;
  description: string;
  action: string;
  target: string;
  path: string;
}) {
  try {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in settingTypes)) continue;
      const secret = secretKeys?.has(key) ?? false;
      const stored = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      if (secret && stored.trim() === "") continue;

      await upsertCredential({
        appId,
        key,
        value: stored,
        scope: "all",
        secret,
        description,
        updatedBy: admin.email,
      });
    }
    await logAction(admin, action, target, { keys: Object.keys(values) });
    revalidatePath(path);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}
