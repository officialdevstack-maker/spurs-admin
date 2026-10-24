import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import StatCard from "@/components/page/StatCard";
import StatGrid from "@/components/page/StatGrid";
import { CheckCircle2, Clock, Wallet } from "lucide-react";
import CashoutQueue from "./CashoutQueue";

export const dynamic = "force-dynamic";

export default async function Cashouts() {
  await requirePermission("money.payouts.approve");
  const rows = await survey.redemptions();
  const awaiting = rows.filter((row) => row.status === "pending").length;
  const onHold = rows.filter((row) => row.status === "approved").length;

  return (
    <div className="space-y-6">
      <StatGrid cols={3}>
        <StatCard label="Awaiting review" value={awaiting} icon={Clock} tone={awaiting ? "warn" : "good"} />
        <StatCard label="On hold" value={onHold} icon={Wallet} />
        <StatCard label="Visible requests" value={rows.length} icon={CheckCircle2} />
      </StatGrid>
      <CashoutQueue
        rows={rows}
        holdNote="Approving starts the hold — the wallet is credited automatically once it elapses, not at the moment you click."
      />
    </div>
  );
}
