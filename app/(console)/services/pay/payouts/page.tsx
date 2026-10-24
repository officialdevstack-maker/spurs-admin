import { listPayouts } from "@/lib/pay-data";
import PayoutsTable from "./PayoutsTable";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const payouts = await listPayouts();
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{payouts.length} payouts across all merchants — test and live.</p>
      <PayoutsTable data={payouts} />
    </div>
  );
}
