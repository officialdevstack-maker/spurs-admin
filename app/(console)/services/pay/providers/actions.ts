"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { upsertCredential } from "@/lib/credentials";
import { logAction } from "@/lib/audit";
import { PROVIDERS, credKey, feePercentKey, feeFlatKey, webhookSecretKey, buildWebhookUrl } from "@/lib/pay-providers";

function fail(e: unknown) { return { ok: false as const, error: e instanceof Error ? e.message : "Request failed" }; }

/** Save a provider's credentials + deposit fee. */
export async function saveProviderAction(input: {
  provider: string;
  values: Record<string, string>;
  feePercent: string;
  feeFlat: string;
}) {
  let admin;
  try { admin = await requireSuperadmin(); } catch (e) { return fail(e); }

  const def = PROVIDERS.find((p) => p.id === input.provider);
  if (!def) return fail(new Error("Unknown provider"));

  try {
    for (const f of def.fields) {
      const value = input.values[f.key] ?? "";
      await upsertCredential({
        appId: "pay", key: credKey(input.provider, f.key), value,
        scope: "all", secret: f.secret, description: `${def.label} ${f.label}`, updatedBy: admin.email,
      });
    }
    await upsertCredential({ appId: "pay", key: feePercentKey(input.provider), value: input.feePercent || "0", scope: "all", secret: false, description: `${def.label} deposit fee %`, updatedBy: admin.email });
    await upsertCredential({ appId: "pay", key: feeFlatKey(input.provider), value: input.feeFlat || "0", scope: "all", secret: false, description: `${def.label} deposit flat fee`, updatedBy: admin.email });

    await logAction(admin, "pay.provider.updated", input.provider, { fields: def.fields.length });
    revalidatePath("/services/pay/providers");
    return { ok: true as const };
  } catch (e) { return fail(e); }
}

/** Generate or rotate the provider's webhook secret; returns the new URL. */
export async function refreshWebhookAction(provider: string) {
  let admin;
  try { admin = await requireSuperadmin(); } catch (e) { return fail(e); }

  const def = PROVIDERS.find((p) => p.id === provider);
  if (!def) return fail(new Error("Unknown provider"));

  try {
    const secret = "whsec_" + randomBytes(24).toString("hex");
    await upsertCredential({
      appId: "pay", key: webhookSecretKey(provider), value: secret,
      scope: "all", secret: true, description: `${def.label} webhook secret`, updatedBy: admin.email,
    });
    await logAction(admin, "pay.provider.webhook_rotated", provider);
    revalidatePath("/services/pay/providers");
    return { ok: true as const, url: buildWebhookUrl(provider, secret) };
  } catch (e) { return fail(e); }
}
