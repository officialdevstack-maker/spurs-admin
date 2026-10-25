import { listTransactions } from "@/lib/data";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { ArrowLeftRight } from "lucide-react";
import TransactionsTable from "./TransactionsTable";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  await requirePermission("money.read");
  const txns = await listTransactions(500);
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet transactions" description={`Every credit and debit across all wallets. ${txns.length} total.`} />
      {txns.length
        ? <TransactionsTable data={txns} />
        : <EmptyState icon={ArrowLeftRight} title="No wallet transactions yet" description="Credits and debits will appear here as wallet activity occurs." />}
    </div>
  );
}
