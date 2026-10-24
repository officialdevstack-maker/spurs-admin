import { listWalletTxns } from "@/lib/wallet-data";
import { requirePermission } from "@/lib/auth";
import WalletTxnsTable from "./WalletTxnsTable";

export const dynamic = "force-dynamic";

export default async function WalletTransactionsPage() {
  await requirePermission("money.read");
  const txns = await listWalletTxns();
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Every ledger entry across all wallets. The Origin column links each funding entry back to its source service.</p>
      <WalletTxnsTable data={txns} />
    </div>
  );
}
