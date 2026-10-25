import { listMerchants } from "@/lib/pay-data";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { Store } from "lucide-react";
import MerchantsTable from "./MerchantsTable";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  await requirePermission("money.read");
  const merchants = await listMerchants();
  return (
    <div className="space-y-6">
      <PageHeader title="Merchants" description={`${merchants.length} merchants, ranked by amount collected.`} />
      {merchants.length
        ? <MerchantsTable data={merchants} />
        : <EmptyState icon={Store} title="No merchants yet" description="Merchants will appear here after their accounts are created." />}
    </div>
  );
}
