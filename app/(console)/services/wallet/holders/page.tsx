import { listHolders } from "@/lib/wallet-data";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { Users } from "lucide-react";
import HoldersTable from "./HoldersTable";

export const dynamic = "force-dynamic";

export default async function WalletHoldersPage() {
  await requirePermission("money.read");
  const holders = await listHolders();
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet holders" description={`${holders.length} wallet holders. Each links to the full cross-service view of that Spurs customer.`} />
      {holders.length
        ? <HoldersTable data={holders} />
        : <EmptyState icon={Users} title="No wallet holders yet" description="Customers with wallets will appear here." />}
    </div>
  );
}
