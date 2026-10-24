import { requirePermission } from "@/lib/auth";
import { listAdvances, getStaff } from "@/lib/payroll/staff-data";
import StatCard from "@/components/page/StatCard";
import StatGrid from "@/components/page/StatGrid";
import { Clock, HandCoins } from "lucide-react";
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
  const awaiting = rows.filter((advance) => advance.status === "pending");
  const awaitingMinor = awaiting.reduce((total, advance) => total + BigInt(advance.amountMinor), BigInt(0));
  const requestedAmount = `₦${(awaitingMinor / BigInt(100)).toLocaleString("en-NG")}.${(awaitingMinor % BigInt(100)).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salary advances</h1>
        <p className="text-muted-foreground text-sm">
          Requests to draw pay early, repaid from future payroll.
        </p>
      </div>

      <StatGrid cols={2}>
        <StatCard label="Awaiting review" value={awaiting.length} icon={Clock} tone={awaiting.length ? "warn" : "good"} />
        <StatCard label="Requested amount" value={requestedAmount} icon={HandCoins} hint="Pending advance requests" />
      </StatGrid>
      <AdvancesQueue advances={rows} />
    </div>
  );
}
