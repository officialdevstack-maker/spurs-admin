import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import CashoutQueue from "./CashoutQueue";

export const dynamic = "force-dynamic";

export default async function Cashouts() {
  await requirePermission("money.payouts.approve");
  const rows = await survey.redemptions();

  return (
    <CashoutQueue
      rows={rows}
      holdNote="Approving starts the hold — the wallet is credited automatically once it elapses, not at the moment you click."
    />
  );
}
