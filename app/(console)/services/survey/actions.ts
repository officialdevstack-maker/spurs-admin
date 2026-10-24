"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { survey } from "@/lib/sdk/survey";

/**
 * Admin actions on Spurs Earn. Every one of these is a decision about someone's
 * money or standing, so each is attributed to the signed-in admin and written
 * to the audit log — the Earn app records the same decision on its own side.
 */

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

/** Approve a cash-out. This starts the hold; the wallet is credited when it elapses. */
export async function approveCashoutAction(id: string, reference: string) {
  const admin = await requireAdmin();
  try {
    await survey.approveRedemption(id, admin.email);
    await logAction(admin, "survey.cashout_approve", reference);
    revalidatePath("/services/survey/cashouts");
    revalidatePath("/services/survey");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

/** Decline a cash-out. The user's points are returned immediately. */
export async function rejectCashoutAction(id: string, reference: string, reason: string) {
  const admin = await requireAdmin();
  try {
    await survey.rejectRedemption(id, admin.email, reason || undefined);
    await logAction(admin, "survey.cashout_reject", `${reference}: ${reason || "no reason given"}`);
    revalidatePath("/services/survey/cashouts");
    revalidatePath("/services/survey");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

/** Release every hold that has already elapsed, without waiting for the scheduler. */
export async function processPayoutsAction() {
  const admin = await requireAdmin();
  try {
    const r = await survey.processPayouts();
    await logAction(admin, "survey.process_payouts", `${r.credited} credited, ${r.failed} failed`);
    revalidatePath("/services/survey/cashouts");
    revalidatePath("/services/survey");
    return { ok: true as const, credited: r.credited, failed: r.failed };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function approveSubmissionAction(id: string) {
  const admin = await requireAdmin();
  try {
    const r = await survey.approveSubmission(id, admin.email);
    await logAction(admin, "survey.submission_approve", `${id} (+${r.points} pts)`);
    revalidatePath("/services/survey/review");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function rejectSubmissionAction(id: string, reason: string) {
  const admin = await requireAdmin();
  try {
    await survey.rejectSubmission(id, admin.email, reason || undefined);
    await logAction(admin, "survey.submission_reject", `${id}: ${reason || "no reason given"}`);
    revalidatePath("/services/survey/review");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function setStandingAction(
  userId: string,
  status: "active" | "restricted" | "banned",
  reason: string,
  days?: number,
) {
  const admin = await requireAdmin();
  try {
    await survey.setStanding(userId, status, admin.email, reason || undefined, days);
    await logAction(admin, "survey.set_standing", `${userId} → ${status}`);
    revalidatePath("/services/survey/earners");
    revalidatePath("/services/survey/risk");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function adjustXpAction(userId: string, delta: number, reason: string) {
  const admin = await requireAdmin();
  try {
    await survey.adjustXp(userId, delta, admin.email, reason || undefined);
    await logAction(admin, "survey.adjust_xp", `${userId} ${delta > 0 ? "+" : ""}${delta} XP`);
    revalidatePath("/services/survey/earners");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
