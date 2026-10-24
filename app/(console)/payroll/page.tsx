import { requirePermission, can } from "@/lib/auth";
import { listRuns } from "@/lib/payroll/runs";
import PayrollPanel, { type RunRow } from "./PayrollPanel";

export const dynamic = "force-dynamic";

export default async function Payroll() {
  await requirePermission("payroll.read");

  const [runs, build, approve, pay] = await Promise.all([
    listRuns(),
    can("payroll.build"),
    can("payroll.approve"),
    can("payroll.pay"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground text-sm">
          Monthly runs, from draft to paid.
        </p>
      </div>

      <PayrollPanel
        currentPeriod={new Date().toISOString().slice(0, 7)}
        perms={{ build, approve, pay }}
        runs={runs.map((r): RunRow => ({
          id: r.id,
          period: r.period,
          status: r.status,
          grossMinor: r.grossMinor,
          netMinor: r.netMinor,
          employerCostMinor: r.employerCostMinor,
          headcount: r.headcount,
          approvedBy: r.approvedBy,
        }))}
      />
    </div>
  );
}
