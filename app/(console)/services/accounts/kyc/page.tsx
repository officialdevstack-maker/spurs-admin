import { Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Pagination from "@/components/Pagination";
import { accounts } from "@/lib/sdk/accounts";
import KycQueue from "./KycQueue";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function KycPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { status, page: pageParam } = await searchParams;
  const { kyc, counts } = await accounts.kycQueue(status);

  const page = Math.max(1, Number(pageParam) || 1);
  const rows = kyc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tiles = [
    { label: "Awaiting review", value: counts.pending, icon: Clock },
    { label: "Verified", value: counts.verified, icon: ShieldCheck },
    { label: "Rejected", value: counts.rejected, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Identity verification requests. Approving here sets the account's tier, which rides the Spurs session to Wallet, Pay and Cloud. A reused BVN/NIN is flagged automatically.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{t.label}</CardTitle>
              <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg"><t.icon className="size-4" /></span>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold tracking-tight">{t.value.toLocaleString()}</div></CardContent>
          </Card>
        ))}
      </div>

      <KycQueue rows={rows} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={kyc.length}
        basePath="/services/accounts/kyc" params={{ status }} />
    </div>
  );
}
