import { requirePermission } from "@/lib/auth";
import { listAdvances, getStaff } from "@/lib/payroll/staff-data";
import AdvancesQueue, { type AdvanceRow } from "./AdvancesQueue";

export const dynamic = "force-dynamic";

export default async function Advances() {
  await requirePermission("payroll.advances");
  const advances = await listAdvances();

  // Each request is judged against that person's actual salary, so pull it in.
  const rows: AdvanceRow[] = await Promise.all(
    advances.map(async (a) => {
      const staff = await getStaff(a.staffId);
      return {
        id: a.id,
        staffName: a.staffName,
        amountMinor: a.amountMinor,
        repaidMinor: a.repaidMinor,
        months: a.months,
        reason: a.reason,
        status: a.status,
        monthlyGrossMinor: staff?.monthlyGrossMinor ?? "0",
        createdAt: a.createdAt.toISOString(),
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salary advances</h1>
        <p className="text-muted-foreground text-sm">
          Requests to draw pay early, repaid from future payroll.
        </p>
      </div>

      <AdvancesQueue advances={rows} />
    </div>
  );
}
