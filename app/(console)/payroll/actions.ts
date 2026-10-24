"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { buildDraft, approveRun, payRun } from "@/lib/payroll/runs";
import { reviewAdvance } from "@/lib/payroll/staff-data";

/**
 * Payroll actions.
 *
 * Preparing, approving and paying are three separate permissions on purpose:
 * whoever builds the numbers should not be the one who releases the money.
 */

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

export async function buildPayrollAction(period: string) {
  const admin = await assertPermission("payroll.build");
  try {
    const { run, skipped } = await buildDraft(period, admin.email);
    await logAction(admin, "payroll.build", `${period} — ${run.headcount} people`);
    revalidatePath("/payroll");
    return { ok: true as const, runId: run.id, headcount: run.headcount, skipped };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function approvePayrollAction(id: string) {
  const admin = await assertPermission("payroll.approve");
  try {
    await approveRun(id, admin.email);
    await logAction(admin, "payroll.approve", id);
    revalidatePath("/payroll");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function payPayrollAction(id: string) {
  const admin = await assertPermission("payroll.pay");
  try {
    const result = await payRun(id, admin.email);
    await logAction(admin, "payroll.pay", `${id} — ${result.paid} paid, ${result.failed} failed`);
    revalidatePath("/payroll");
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function reviewAdvanceAction(
  id: string, decision: "approved" | "rejected", reason?: string,
) {
  const admin = await assertPermission("payroll.advances");
  try {
    await reviewAdvance(id, decision, admin.email, reason);
    await logAction(admin, "payroll.advance_" + decision, id);
    revalidatePath("/payroll/advances");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
