import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db, staffProfiles, salaryAdvances, attendance,
  type StaffProfile, type SalaryAdvance,
} from "@/lib/db";

/**
 * The staff reads payroll needs.
 *
 * The day-to-day (directory, tasks, rota, notices) lives in Spurs Team; payroll
 * stays here in the control plane because it moves real money. Both read the
 * same tables — this file is only the slice payroll cares about.
 */

export async function listPayableStaff(): Promise<StaffProfile[]> {
  return db.select().from(staffProfiles)
    .where(sql`${staffProfiles.status} in ('active','on_leave')`)
    .orderBy(asc(staffProfiles.fullName));
}

export async function getStaff(id: string): Promise<StaffProfile | null> {
  const [row] = await db.select().from(staffProfiles).where(eq(staffProfiles.id, id)).limit(1);
  return row ?? null;
}

/** Why someone can't be paid. Bank details are the usual thing missing. */
export function payabilityIssues(staff: StaffProfile): string[] {
  const issues: string[] = [];
  if (staff.payType === "none") issues.push("Pay type is set to none");
  if (!staff.bankCode || !staff.accountNumber) issues.push("No bank account on file");
  if (staff.payType === "salary" && BigInt(staff.monthlyGrossMinor) <= BigInt(0)) issues.push("No salary set");
  if (staff.payType === "hourly" && BigInt(staff.hourlyRateMinor) <= BigInt(0)) issues.push("No hourly rate set");
  if (staff.status === "exited") issues.push("Has left the company");
  return issues;
}

/** Outstanding advances, and what to withhold from this month's pay. */
export async function advanceRepaymentFor(staffId: string): Promise<{
  advances: SalaryAdvance[];
  monthlyMinor: bigint;
}> {
  const open = await db.select().from(salaryAdvances)
    .where(and(eq(salaryAdvances.staffId, staffId), eq(salaryAdvances.status, "repaying")));

  let monthly = BigInt(0);
  for (const advance of open) {
    const outstanding = BigInt(advance.amountMinor) - BigInt(advance.repaidMinor);
    if (outstanding <= BigInt(0)) continue;
    const perMonth = BigInt(advance.amountMinor) / BigInt(advance.months);
    monthly += outstanding < perMonth ? outstanding : perMonth;
  }
  return { advances: open, monthlyMinor: monthly };
}

/** Minutes logged in a period — what hourly pay is computed from. */
export async function minutesWorked(staffId: string, from: string, to: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${attendance.minutes}), 0)::int` })
    .from(attendance)
    .where(and(
      eq(attendance.staffId, staffId),
      gte(attendance.day, from),
      lte(attendance.day, to),
    ));
  return Number(row?.total ?? 0);
}

/** Advance requests, for the review queue. */
export async function listAdvances(status?: string): Promise<(SalaryAdvance & { staffName: string })[]> {
  const rows = await db
    .select({ advance: salaryAdvances, staffName: staffProfiles.fullName })
    .from(salaryAdvances)
    .innerJoin(staffProfiles, eq(staffProfiles.id, salaryAdvances.staffId))
    .where(status ? eq(salaryAdvances.status, status) : undefined)
    .orderBy(desc(salaryAdvances.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r.advance, staffName: r.staffName }));
}

export async function reviewAdvance(
  id: string, decision: "approved" | "rejected", reviewer: string, reason?: string,
): Promise<SalaryAdvance> {
  const [advance] = await db.update(salaryAdvances).set({
    status: decision === "approved" ? "repaying" : "rejected",
    reviewedBy: reviewer,
    rejectionReason: decision === "rejected" ? (reason ?? "Not approved") : null,
    approvedAt: decision === "approved" ? new Date() : null,
  }).where(and(eq(salaryAdvances.id, id), eq(salaryAdvances.status, "pending"))).returning();

  if (!advance) throw new Error("That advance has already been reviewed");
  return advance;
}
