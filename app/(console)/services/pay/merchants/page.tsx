import { listMerchants } from "@/lib/pay-data";
import MerchantsTable from "./MerchantsTable";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const merchants = await listMerchants();
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{merchants.length} merchants, ranked by amount collected.</p>
      <MerchantsTable data={merchants} />
    </div>
  );
}
