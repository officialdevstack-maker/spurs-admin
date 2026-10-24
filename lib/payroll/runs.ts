import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db, staffProfiles, payrollRuns, payrollItems, salaryAdvances,
  type PayrollRun, type PayrollItem, type StaffProfile,
} from "@/lib/db";
import { computePay, computeHourlyPay, naira, DEFAULT_CONFIG, type PayrollConfig } from "./engine";
import { advanceRepaymentFor, minutesWorked, payabilityIssues } from "./staff-data";
import { payStaff } from "./payout";
import { sendPayslip } from "./payslip";

/**
 * A month's payroll, start to finish.
 *
 *   draft → approved → paying → paid
 *
 * A draft can be rebuilt as often as you like; nothing leaves the company until
 * someone approves it, and approval is a separate permission from building it.
 * That separation is the whole control: whoever prepares the numbers should not
 * be the one who releases the money.
 */

const period = (date = new Date()) => date.toISOString().slice(0, 7);   // YYYY-MM

/** First and last day of a YYYY-MM period. */
function periodRange(p: string): { from: string; to: string } {
  const [year, month] = p.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${p}-01`, to: `${p}-${String(last).padStart(2, "0")}` };
}

export async function listRuns(limit = 24): Promise<PayrollRun[]> {
  return db.select().from(payrollRuns).orderBy(desc(payrollRuns.period)).limit(limit);
}

export async function getRun(id: string) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) return null;

  const items = await db
    .select({ item: payrollItems, staff: staffProfiles })
    .from(payrollItems)
    .innerJoin(staffProfiles, eq(staffProfiles.id, payrollItems.staffId))
    .where(eq(payrollItems.runId, id))
    .orderBy(asc(staffProfiles.fullName));

  return { run, items };
}

/**
 * Build (or rebuild) the draft for a period.
 *
 * Rebuilding wipes and recreates the lines, which is safe precisely because a
 * draft has paid nobody. Once a run is approved it's frozen — the figures on a
 * payslip must not change after someone has been told what they're getting.
 */
export async function buildDraft(
  p: string = period(),
  by?: string,
  config: PayrollConfig = DEFAULT_CONFIG,
): Promise<{ run: PayrollRun; skipped: { name: string; reasons: string[] }[] }> {
  const [existing] = await db.select().from(payrollRuns).where(eq(payrollRuns.period, p)).limit(1);
  if (existing && existing.status !== "draft") {
    throw new Error(`Payroll for ${p} is already ${existing.status} and can't be rebuilt`);
  }

  const run = existing
    ? existing
    : (await db.insert(payrollRuns).values({ period: p, createdBy: by ?? null }).returning())[0];

  await db.delete(payrollItems).where(eq(payrollItems.runId, run.id));

  const staff = await db.select().from(staffProfiles)
    .where(sql`${staffProfiles.status} in ('active','on_leave')`);

  const { from, to } = periodRange(p);
  const skipped: { name: string; reasons: string[] }[] = [];

  let gross = 0, deductions = 0, net = 0, employerCost = 0, headcount = 0;

  for (const person of staff) {
    const issues = payabilityIssues(person as StaffProfile);
    if (issues.length) {
      skipped.push({ name: person.fullName, reasons: issues });
      continue;
    }

    // Withhold any advance repayment due this month.
    const { monthlyMinor: advanceDue } = await advanceRepaymentFor(person.id);
    const otherDeductions: Record<string, number> =
      advanceDue > BigInt(0) ? { "Salary advance": Number(advanceDue) } : {};

    const allowances = Object.fromEntries(
      Object.entries(person.allowances ?? {}).map(([k, v]) => [k, Number(v)]),
    );

    const slip = person.payType === "hourly"
      ? computeHourlyPay(
          Number(person.hourlyRateMinor),
          await minutesWorked(person.id, from, to),
          { allowances, pensionExempt: person.pensionExempt, nhfExempt: person.nhfExempt, otherDeductions },
          config,
        )
      : computePay(
          {
            monthlyGrossMinor: Number(person.monthlyGrossMinor),
            allowances,
            pensionExempt: person.pensionExempt,
            nhfExempt: person.nhfExempt,
            otherDeductions,
          },
          config,
        );

    // Nobody is paid ₦0 by accident — an hourly person who logged no hours is
    // skipped and flagged rather than issued an empty payslip.
    if (slip.grossMinor <= 0) {
      skipped.push({ name: person.fullName, reasons: ["No pay for this period"] });
      continue;
    }

    await db.insert(payrollItems).values({
      runId: run.id,
      staffId: person.id,
      basicMinor: String(slip.basicMinor),
      allowances: slip.allowances,
      grossMinor: String(slip.grossMinor),
      pensionEmployeeMinor: String(slip.pensionEmployeeMinor),
      pensionEmployerMinor: String(slip.pensionEmployerMinor),
      nhfMinor: String(slip.nhfMinor),
      payeMinor: String(slip.payeMinor),
      otherDeductions: slip.otherDeductions,
      netMinor: String(slip.netMinor),
      hours: person.payType === "hourly"
        ? (await minutesWorked(person.id, from, to) / 60).toFixed(2)
        : null,
      breakdown: slip.breakdown as Record<string, unknown>,
    });

    gross += slip.grossMinor;
    deductions += slip.totalDeductionsMinor;
    net += slip.netMinor;
    employerCost += slip.employerCostMinor;
    headcount++;
  }

  const [updated] = await db.update(payrollRuns).set({
    grossMinor: String(gross),
    deductionsMinor: String(deductions),
    netMinor: String(net),
    employerCostMinor: String(employerCost),
    headcount,
    status: "draft",
  }).where(eq(payrollRuns.id, run.id)).returning();

  return { run: updated, skipped };
}

/** Approve. Separate permission from building — and from paying. */
export async function approveRun(id: string, by: string): Promise<PayrollRun> {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) throw new Error("Payroll run not found");
  if (run.status !== "draft") throw new Error(`This run is already ${run.status}`);
  if (run.headcount === 0) throw new Error("There's nobody to pay in this run");

  const [approved] = await db.update(payrollRuns)
    .set({ status: "approved", approvedBy: by, approvedAt: new Date() })
    .where(eq(payrollRuns.id, id)).returning();
  return approved;
}

export interface PayResult {
  paid: number;
  failed: number;
  total: number;
}

/**
 * Pay an approved run.
 *
 * Each line pays independently and is marked as it goes: a bank rejecting one
 * account must not strand the other nineteen people. Every transfer carries the
 * item's own reference, so re-running after a partial failure retries only what
 * hasn't been paid.
 */
export async function payRun(id: string, by: string): Promise<PayResult> {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) throw new Error("Payroll run not found");
  if (!["approved", "paying", "partly_paid"].includes(run.status)) {
    throw new Error(`Refusing to pay a run in state "${run.status}"`);
  }

  await db.update(payrollRuns).set({ status: "paying" }).where(eq(payrollRuns.id, id));

  const lines = await db
    .select({ item: payrollItems, staff: staffProfiles })
    .from(payrollItems)
    .innerJoin(staffProfiles, eq(staffProfiles.id, payrollItems.staffId))
    .where(and(eq(payrollItems.runId, id), sql`${payrollItems.payoutStatus} <> 'paid'`));

  let paid = 0, failed = 0;

  for (const { item, staff } of lines) {
    try {
      const reference = `pay_${run.period.replace("-", "")}_${item.id.slice(0, 8)}`;

      await payStaff({
        bankCode: staff.bankCode!,
        accountNumber: staff.accountNumber!,
        accountName: staff.accountName ?? staff.fullName,
        amountMinor: Number(item.netMinor),
        reference,
        narration: `Salary ${run.period}`,
      });

      await db.update(payrollItems)
        .set({ payoutStatus: "paid", payoutRef: reference, paidAt: new Date(), payoutError: null })
        .where(eq(payrollItems.id, item.id));

      await creditAdvanceRepayment(staff.id, item);

      // Best-effort, and deliberately after the money moved: a payslip that
      // fails to send must never make a completed payment look failed.
      await sendPayslip(item, staff, run).catch(() => {});
      paid++;
    } catch (e) {
      await db.update(payrollItems).set({
        payoutStatus: "failed",
        payoutError: e instanceof Error ? e.message : "Transfer failed",
      }).where(eq(payrollItems.id, item.id));
      failed++;
    }
  }

  const [{ outstanding }] = await db
    .select({ outstanding: sql<number>`count(*) filter (where ${payrollItems.payoutStatus} <> 'paid')::int` })
    .from(payrollItems)
    .where(eq(payrollItems.runId, id));

  await db.update(payrollRuns).set({
    status: Number(outstanding) === 0 ? "paid" : "partly_paid",
    paidAt: Number(outstanding) === 0 ? new Date() : null,
  }).where(eq(payrollRuns.id, id));

  void by;
  return { paid, failed, total: lines.length };
}

/** Record that this month's slice of an advance has now been recovered. */
async function creditAdvanceRepayment(staffId: string, item: PayrollItem): Promise<void> {
  const withheld = Number(item.otherDeductions?.["Salary advance"] ?? 0);
  if (withheld <= 0) return;

  const open = await db.select().from(salaryAdvances)
    .where(and(eq(salaryAdvances.staffId, staffId), eq(salaryAdvances.status, "repaying")))
    .orderBy(asc(salaryAdvances.createdAt));

  let remaining = withheld;
  for (const advance of open) {
    if (remaining <= 0) break;
    const outstanding = Number(advance.amountMinor) - Number(advance.repaidMinor);
    const applied = Math.min(remaining, outstanding);

    const repaid = Number(advance.repaidMinor) + applied;
    await db.update(salaryAdvances).set({
      repaidMinor: String(repaid),
      status: repaid >= Number(advance.amountMinor) ? "repaid" : "repaying",
    }).where(eq(salaryAdvances.id, advance.id));

    remaining -= applied;
  }
}

/** One person's payslips, for their own page. */
export async function payslipsFor(staffId: string, limit = 24) {
  const rows = await db
    .select({ item: payrollItems, run: payrollRuns })
    .from(payrollItems)
    .innerJoin(payrollRuns, eq(payrollRuns.id, payrollItems.runId))
    .where(and(eq(payrollItems.staffId, staffId), eq(payrollItems.payoutStatus, "paid")))
    .orderBy(desc(payrollRuns.period))
    .limit(limit);
  return rows;
}

/** What payroll costs, month by month — the chart finance actually wants. */
export async function costSeries(months = 12) {
  const runs = await db.select().from(payrollRuns)
    .where(sql`${payrollRuns.status} in ('paid','partly_paid','approved')`)
    .orderBy(desc(payrollRuns.period))
    .limit(months);

  return runs.reverse().map((r) => ({
    period: r.period,
    grossMinor: Number(r.grossMinor),
    netMinor: Number(r.netMinor),
    employerCostMinor: Number(r.employerCostMinor),
    headcount: r.headcount,
  }));
}

export { naira };
