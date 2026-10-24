import { listHolders } from "@/lib/wallet-data";
import HoldersTable from "./HoldersTable";

export const dynamic = "force-dynamic";

export default async function WalletHoldersPage() {
  const holders = await listHolders();
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{holders.length} wallet holders. Each links to the full cross-service view of that Spurs account.</p>
      <HoldersTable data={holders} />
    </div>
  );
}
