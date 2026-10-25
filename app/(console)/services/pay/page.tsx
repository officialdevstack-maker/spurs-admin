import Link from "next/link";
import { ArrowUpRight, CreditCard, RotateCcw, Store, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import LineChart from "@/components/charts/LineChart";
import StatCard from "@/components/page/StatCard";
import StatGrid from "@/components/page/StatGrid";
import SectionCard from "@/components/page/SectionCard";
import EmptyState from "@/components/page/EmptyState";
import PageHeader from "@/components/page/PageHeader";
import { formatNaira } from "@/lib/format";
import { dailyPoints } from "@/lib/series";
import { listPayments } from "@/lib/data";
import { requirePermission } from "@/lib/auth";
import { payStats, payVolumeSeries, statusBreakdown, methodBreakdown, topMerchants } from "@/lib/pay-data";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  successful: "#16a34a",
  pending: "#f59e0b",
  failed: "#dc2626",
  refunded: "#9ca3af",
  partially_refunded: "#a78bfa",
};
const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "secondary",
  partially_refunded: "secondary",
};

export default async function PayOverview() {
  await requirePermission("money.read");
  const [stats, series, statuses, methods, top, recent] = await Promise.all([
    payStats(),
    payVolumeSeries(14),
    statusBreakdown(),
    methodBreakdown(),
    topMerchants(5),
    listPayments(6),
  ]);

  const points = dailyPoints(series, 14);
  const statusSlices = statuses.map((s) => ({
    label: s.status.replace(/_/g, " "),
    value: s.count,
    color: STATUS_COLOR[s.status] ?? "#9ca3af",
  }));
  const methodBars = methods.map((m) => ({ label: (m.method ?? "unknown").replace(/_/g, " "), value: m.count }));
  const topBars = top.map((t) => ({ label: t.business, value: Math.round(t.collected / 100), sub: "₦" }));

  return (
    <div className="space-y-6">
      <PageHeader title="Pay overview" description="Payment volume, payouts, merchants, and recent activity across Spurs Pay." />
      <StatGrid cols={4}>
        <StatCard label="Collected" icon={TrendingUp} value={formatNaira(stats.collected)} hint={`${stats.live.count} live · ${stats.test.count} test`} />
        <StatCard label="Merchants" icon={Store} value={stats.merchants} hint={`${stats.virtualAccounts} virtual accounts`} />
        <StatCard label="Paid out" icon={ArrowUpRight} value={formatNaira(stats.paidOut)} hint={`${stats.payouts} payouts`} />
        <StatCard label="Refunded" icon={RotateCcw} value={formatNaira(stats.refunded)} tone={stats.refunded > 0 ? "warn" : "default"} hint={`${stats.invoices} invoices`} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Collected volume" description="Successful payments · last 14 days" className="lg:col-span-2">
          <LineChart data={points} />
        </SectionCard>
        <SectionCard title="By status">
          <DonutChart data={statusSlices} centerLabel="payments" />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Top merchants"
          action={<Link href="/services/pay/merchants" className="text-primary text-sm font-medium hover:underline">All</Link>}
        >
          {topBars.length ? <BarChart data={topBars} /> : <EmptyState compact title="No merchants yet" />}
        </SectionCard>
        <SectionCard title="Successful by method">
          {methodBars.length ? <BarChart data={methodBars} /> : <EmptyState compact title="No payments yet" />}
        </SectionCard>
      </div>

      <SectionCard title="Recent payments" flush action={<Link href="/services/pay/payments" className="text-primary text-sm font-medium hover:underline">View all</Link>}>
        {recent.length === 0 ? (
          <EmptyState compact icon={CreditCard} title="No payments yet" />
        ) : (
          <div className="divide-y">
            {recent.map((p) => (
              <div key={p.reference} className="flex items-center gap-3 px-6 py-2.5">
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full">
                  <CreditCard className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.business ?? p.customerEmail ?? "Payment"}</div>
                  <div className="text-muted-foreground truncate font-mono text-xs">{p.reference}</div>
                </div>
                <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="hidden sm:inline-flex">
                  {p.status}
                </Badge>
                <div className="w-24 text-right text-sm font-semibold tabular-nums">{formatNaira(p.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
