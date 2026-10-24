import { listPayments } from "@/lib/data";
import { requirePermission } from "@/lib/auth";
import PaymentsTable from "../../../payments/PaymentsTable";

export const dynamic = "force-dynamic";

export default async function PayPaymentsPage() {
  await requirePermission("money.read");
  const payments = await listPayments(500);
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Every payment across all merchants — test and live. {payments.length} total.</p>
      <PaymentsTable data={payments} />
    </div>
  );
}
