import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import StatCard from "@/components/page/StatCard";
import StatGrid from "@/components/page/StatGrid";
import { ClipboardList, ShieldAlert } from "lucide-react";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function Review() {
  await requirePermission("ops.review");
  const rows = await survey.reviewQueue();
  const highRisk = rows.filter((row) => row.riskScore >= 75).length;
  return (
    <div className="space-y-6">
      <StatGrid cols={2}>
        <StatCard label="Awaiting review" value={rows.length} icon={ClipboardList} tone={rows.length ? "warn" : "good"} />
        <StatCard label="High risk" value={highRisk} icon={ShieldAlert} tone={highRisk ? "bad" : "good"} />
      </StatGrid>
      <ReviewQueue rows={rows} />
    </div>
  );
}
