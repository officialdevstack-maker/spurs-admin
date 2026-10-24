import { listTransactions } from "@/lib/data";
import TransactionsTable from "./TransactionsTable";

export default async function TransactionsPage() {
  const txns = await listTransactions(500);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet transactions</h1>
        <p className="text-muted-foreground text-sm">Every credit and debit across all wallets. {txns.length} total.</p>
      </div>
      <TransactionsTable data={txns} />
    </div>
  );
}
