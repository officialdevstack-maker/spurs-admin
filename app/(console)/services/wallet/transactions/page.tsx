import { listWalletTxns } from "@/lib/wallet-data";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { ArrowLeftRight } from "lucide-react";
import WalletTxnsTable from "./WalletTxnsTable";

export const dynamic = "force-dynamic";

export default async function WalletTransactionsPage() {
  await requirePermission("money.read");
  const txns = await listWalletTxns();
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet ledger" description="Every ledger entry across all wallets. The Origin column links each funding entry back to its source service." />
      {txns.length
        ? <WalletTxnsTable data={txns} />
        : <EmptyState icon={ArrowLeftRight} title="No wallet transactions yet" description="Ledger entries will appear here as wallet activity occurs." />}
    </div>
  );
}
