import { listPayments } from "@/lib/data";
import { requirePermission } from "@/lib/auth";
import PaymentsTable from "./PaymentsTable";

export default async function PaymentsPage() {
  await requirePermission("money.read");
  const payments = await listPayments(500);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm">Every payment across all merchants — test and live. {payments.length} total.</p>
      </div>
      <PaymentsTable data={payments} />
    </div>
  );
}
