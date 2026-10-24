"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperadmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { giftcards } from "@/lib/sdk/giftcards";

/**
 * Admin actions on the gift card business. Each one is a decision about
 * someone's money, so every call is attributed to the signed-in admin and
 * written to the audit log.
 */

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

export async function approveTradeAction(id: string, reference: string) {
  const admin = await requireAdmin();
  try {
    await giftcards.approveTrade(id, admin.email);
    await logAction(admin, "giftcards.trade_approve", reference);
    revalidatePath("/services/giftcards/review");
    revalidatePath("/services/giftcards");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function rejectTradeAction(id: string, reference: string, reason: string) {
  const admin = await requireAdmin();
  try {
    await giftcards.rejectTrade(id, admin.email, reason || undefined);
    await logAction(admin, "giftcards.trade_reject", `${reference}: ${reason || "no reason given"}`);
    revalidatePath("/services/giftcards/review");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

/**
 * Reveal the card code so a reviewer can check it. This is the value itself, so
 * the audit entry matters more here than anywhere else in the console.
 */
export async function revealTradeAction(id: string, reference: string) {
  const admin = await requireAdmin();
  try {
    const res = await giftcards.revealTrade(id, admin.email);
    await logAction(admin, "giftcards.trade_reveal", reference);
    return { ok: true as const, code: res.code, images: res.images };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

/** Publish a new rate. Superadmin only — this directly sets what we pay out. */
export async function setRateAction(formData: FormData) {
  const admin = await requireSuperadmin();

  const brandId = String(formData.get("brandId") ?? "");
  const naira = Number(formData.get("buyPerUnit") ?? 0);       // naira per 1 unit of face
  const creditBonusPct = Number(formData.get("creditBonusPct") ?? 0);
  const minFace = Number(formData.get("minFace") ?? 5);
  const maxFace = Number(formData.get("maxFace") ?? 500);
  const faceCurrency = String(formData.get("faceCurrency") ?? "USD");

  if (!brandId || !(naira > 0)) return;

  await giftcards.setRate({
    brandId,
    buyMinorPerUnit: String(Math.round(naira * 100)),
    creditBonusPct,
    minFace,
    maxFace,
    faceCurrency,
    updatedBy: admin.email,
  });

  await logAction(admin, "giftcards.rate_set", `${brandId} → ₦${naira}/unit, +${creditBonusPct}% credit`);
  revalidatePath("/services/giftcards/rates");
}

export async function upsertBrandAction(formData: FormData) {
  const admin = await requireSuperadmin();

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!slug || !name) return;

  await giftcards.upsertBrand({
    slug,
    name,
    notes: String(formData.get("notes") ?? "") || null,
    requires: String(formData.get("requires") ?? "both"),
    active: formData.get("active") === "on",
    autoVerify: formData.get("autoVerify") === "on",
  });

  await logAction(admin, "giftcards.brand_upsert", `${slug} (${name})`);
  revalidatePath("/services/giftcards/rates");
}

export async function runJobsAction() {
  const admin = await requireAdmin();
  try {
    const r = await giftcards.runJobs();
    await logAction(admin, "giftcards.run_jobs", `${r.ran} ran, ${r.failed} failed`);
    revalidatePath("/services/giftcards");
    return { ok: true as const, ran: r.ran, failed: r.failed };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function cancelOrderAction(id: string, reason: string) {
  const admin = await requireAdmin();
  try {
    await giftcards.cancelOrder(id, reason);
    await logAction(admin, "giftcards.order_cancel", `${id}: ${reason}`);
    revalidatePath("/services/giftcards/orders");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
