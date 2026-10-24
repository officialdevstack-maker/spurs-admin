import "server-only";
import type { PayrollItem, PayrollRun, StaffProfile } from "@/lib/db";
import { naira } from "./engine";
import { sendMail } from "@/lib/mail/send";

/**
 * Payslips, sent through the platform mailer so they match every other Spurs
 * email and land in the same delivery log.
 *
 * Best-effort by design: the money has already moved by the time this runs, so
 * a mail outage must never make a completed payment look like a failed one.
 */

export async function sendPayslip(
  item: PayrollItem,
  staff: StaffProfile,
  run: PayrollRun,
): Promise<void> {
  if (!staff.email) return;

  const month = new Date(run.period + "-01T00:00:00Z")
    .toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });

  const lines = [
    `Gross pay:            ${naira(Number(item.grossMinor))}`,
    ``,
    `Deductions`,
    `  PAYE tax:           ${naira(Number(item.payeMinor))}`,
    `  Pension (8%):       ${naira(Number(item.pensionEmployeeMinor))}`,
    ...(Number(item.nhfMinor) > 0 ? [`  NHF (2.5%):         ${naira(Number(item.nhfMinor))}`] : []),
    ...Object.entries(item.otherDeductions ?? {}).map(
      ([label, amount]) => `  ${label}:${" ".repeat(Math.max(1, 20 - label.length))}${naira(Number(amount))}`,
    ),
    ``,
    `Net pay:              ${naira(Number(item.netMinor))}`,
    ``,
    `Paid to ${staff.bankName ?? "your bank"} ••••${(staff.accountNumber ?? "").slice(-4)}.`,
    `Your employer also paid ${naira(Number(item.pensionEmployerMinor))} into your pension on top of this.`,
  ].join("\n");

  await sendMail({
    app: "admin",
    template: "generic.notice",
    to: staff.email,
    // One payslip per person per run, however many times payment is retried.
    idempotencyKey: `payslip:${item.id}`,
    context: {
      heading: `Your payslip for ${month}`,
      body: `Hi ${staff.fullName.split(" ")[0]},

You've been paid for ${month}.

${lines}`,
    },
  });
}
