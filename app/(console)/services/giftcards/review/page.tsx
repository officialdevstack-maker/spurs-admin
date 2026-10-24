import { giftcards } from "@/lib/sdk/giftcards";
import { can, requirePermission } from "@/lib/auth";
import StatCard from "@/components/page/StatCard";
import StatGrid from "@/components/page/StatGrid";
import { CreditCard, ShieldAlert } from "lucide-react";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function Review() {
  await requirePermission("ops.review");
  const [rows, canApprove, canReveal] = await Promise.all([
    giftcards.reviewQueue(),
    can("money.payouts.approve"),
    can("ops.cards.reveal"),
  ]);
  const highRisk = rows.filter((row) => row.riskScore >= 60).length;
  return (
    <div className="space-y-6">
      <StatGrid cols={2}>
        <StatCard label="Awaiting review" value={rows.length} icon={CreditCard} tone={rows.length ? "warn" : "good"} />
        <StatCard label="High risk" value={highRisk} icon={ShieldAlert} tone={highRisk ? "bad" : "good"} />
      </StatGrid>
      <ReviewQueue rows={rows} canApprove={canApprove} canReveal={canReveal} />
    </div>
  );
}
