import { Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import Pagination from "@/components/Pagination";
import { can, requirePermission } from "@/lib/auth";
import { accounts } from "@/lib/sdk/accounts";
import KycQueue from "./KycQueue";
import PageHeader from "@/components/page/PageHeader";
import StatCard from "@/components/page/StatCard";
import StatGrid from "@/components/page/StatGrid";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function KycPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requirePermission("customers.read");
  const { status, page: pageParam } = await searchParams;
  const [{ kyc, counts }, canReview] = await Promise.all([
    accounts.kycQueue(status),
    can("customers.kyc.review"),
  ]);

  const page = Math.max(1, Number(pageParam) || 1);
  const rows = kyc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tiles = [
    { label: "Awaiting review", value: counts.pending, icon: Clock },
    { label: "Verified", value: counts.verified, icon: ShieldCheck },
    { label: "Rejected", value: counts.rejected, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity verification"
        description="Review identity checks, set account tiers, and watch for reused BVN or NIN details."
      />

      <StatGrid cols={3}>
        {tiles.map((tile) => (
          <StatCard
            key={tile.label}
            label={tile.label}
            value={tile.value}
            icon={tile.icon}
            tone={tile.label === "Awaiting review" ? tile.value ? "warn" : "good" : "default"}
          />
        ))}
      </StatGrid>

      <KycQueue canReview={canReview} rows={rows} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={kyc.length}
        basePath="/services/accounts/kyc" params={{ status }} />
    </div>
  );
}
