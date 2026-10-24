"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { saveMailSettings } from "@/lib/mail/settings";
import { sendMail, retry, retryFailed, suppress, unsuppress } from "@/lib/mail/send";

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

export async function saveMailAction(formData: FormData) {
  const admin = await assertPermission("platform.mail.manage");

  const keys = [
    "MAIL_PROVIDER", "MAIL_FROM", "MAIL_FROM_NAME", "MAIL_REPLY_TO",
    "MAIL_APP_URL", "MAIL_REDIRECT_TO",
    "MAIL_HOST", "MAIL_PORT", "MAIL_USERNAME", "MAIL_PASSWORD",
    "MAIL_API_KEY", "MAIL_STREAM",
  ];

  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (value !== null) values[key] = String(value);
  }
  values.MAIL_ENABLED = formData.get("MAIL_ENABLED") === "on" ? "true" : "false";

  await saveMailSettings(values, admin.email);
  await logAction(admin, "mail.settings", `provider=${values.MAIL_PROVIDER}, enabled=${values.MAIL_ENABLED}`);
  revalidatePath("/mail");
}

/**
 * Send a real message to a real inbox. The only honest way to know mail works —
 * a green settings form proves nothing.
 */
export async function testMailAction(to: string) {
  const admin = await assertPermission("platform.mail.manage");
  try {
    const outcome = await sendMail({
      app: "admin",
      template: "generic.notice",
      to,
      context: {
        heading: "Your Spurs mail setup works",
        body: `This test was sent by ${admin.email} from the Spurs admin console.\n\nIf you're reading it in a real inbox, the provider, credentials and sending identity are all correct.`,
      },
    });
    await logAction(admin, "mail.test", `${to} → ${outcome.status}`);
    revalidatePath("/mail");
    return { ok: outcome.status === "sent", status: outcome.status, error: outcome.error };
  } catch (e) {
    return { ok: false, status: "failed", error: err(e) };
  }
}

export async function retryMailAction(id: string) {
  const admin = await assertPermission("platform.mail.manage");
  try {
    const outcome = await retry(id);
    await logAction(admin, "mail.retry", `${id} → ${outcome.status}`);
    revalidatePath("/mail");
    return { ok: outcome.status === "sent", status: outcome.status, error: outcome.error };
  } catch (e) {
    return { ok: false, status: "failed", error: err(e) };
  }
}

export async function retryAllFailedAction() {
  const admin = await assertPermission("platform.mail.manage");
  try {
    const r = await retryFailed();
    await logAction(admin, "mail.retry_all", `${r.sent}/${r.retried} sent`);
    revalidatePath("/mail");
    return { ok: true as const, ...r };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function suppressAction(email: string, reason: string) {
  const admin = await assertPermission("platform.mail.manage");
  try {
    await suppress(email, reason || "manual", `Added by ${admin.email}`);
    await logAction(admin, "mail.suppress", email);
    revalidatePath("/mail");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function unsuppressAction(email: string) {
  const admin = await assertPermission("platform.mail.manage");
  try {
    await unsuppress(email);
    await logAction(admin, "mail.unsuppress", email);
    revalidatePath("/mail");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
