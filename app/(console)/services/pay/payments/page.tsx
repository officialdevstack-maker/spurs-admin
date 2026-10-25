import { listPayments } from "@/lib/data";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { CreditCard } from "lucide-react";
import PaymentsTable from "../../../payments/PaymentsTable";

export const dynamic = "force-dynamic";

export default async function PayPaymentsPage() {
  await requirePermission("money.read");
  const payments = await listPayments(500);
  return (
    <div className="space-y-6">
      <PageHeader title="Pay payments" description={`Every payment across all merchants — test and live. ${payments.length} total.`} />
      {payments.length
        ? <PaymentsTable data={payments} />
        : <EmptyState icon={CreditCard} title="No payments yet" description="Payments will appear here when a merchant processes one." />}
    </div>
  );
}
