import { listPayouts } from "@/lib/pay-data";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { ArrowUpRight } from "lucide-react";
import PayoutsTable from "./PayoutsTable";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  await requirePermission("money.read");
  const payouts = await listPayouts();
  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" description={`${payouts.length} payouts across all merchants — test and live.`} />
      {payouts.length
        ? <PayoutsTable data={payouts} />
        : <EmptyState icon={ArrowUpRight} title="No payouts yet" description="Merchant payouts will appear here as they are created." />}
    </div>
  );
}
