import Link from "next/link";
import { CreditCard, Store, ArrowUpRight, RotateCcw, Landmark, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LineChart, { type Point } from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import { payStats, payVolumeSeries, statusBreakdown, methodBreakdown, topMerchants } from "@/lib/pay-data";
import { listPayments } from "@/lib/data";

export const dynamic = "force-dynamic";

const naira = (k: number) => "₦" + Math.round(k / 100).toLocaleString("en-NG");

const STATUS_COLOR: Record<string, string> = {
  successful: "#16a34a", pending: "#f59e0b", failed: "#dc2626",
  refunded: "#9ca3af", partially_refunded: "#a78bfa",
};
const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", pending: "warning", failed: "destructive", refunded: "secondary", partially_refunded: "secondary",
};

function buildPoints(series: { date: string; value: number }[], days: number): Point[] {
  const by = new Map(series.map((s) => [s.date, s.value]));
  const out: Point[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      full: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }),
      value: by.get(key) ?? 0,
    });
  }
  return out;
}

export default async function PayOverview() {
  const [stats, series, statuses, methods, top, recent] = await Promise.all([
    payStats(), payVolumeSeries(14), statusBreakdown(), methodBreakdown(), topMerchants(5), listPayments(6),
  ]);

  const tiles = [
    { label: "Collected", value: naira(stats.collected), icon: TrendingUp, sub: `${stats.live.count} live · ${stats.test.count} test` },
    { label: "Merchants", value: stats.merchants.toLocaleString(), icon: Store, sub: `${stats.virtualAccounts} virtual accounts` },
    { label: "Paid out", value: naira(stats.paidOut), icon: ArrowUpRight, sub: `${stats.payouts} payouts` },
    { label: "Refunded", value: naira(stats.refunded), icon: RotateCcw, sub: `${stats.invoices} invoices` },
  ];

  const points = buildPoints(series, 14);
  const statusSlices = statuses.map((s) => ({ label: s.status.replace(/_/g, " "), value: s.count, color: STATUS_COLOR[s.status] ?? "#9ca3af" }));
  const methodBars = methods.map((m) => ({ label: (m.method ?? "unknown").replace(/_/g, " "), value: m.count }));
  const topBars = top.map((t) => ({ label: t.business, value: Math.round(t.collected / 100), sub: "₦" }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{t.label}</CardTitle>
              <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg"><t.icon className="size-4" /></span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{t.value}</div>
              <div className="text-muted-foreground mt-1 text-xs">{t.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Collected volume</CardTitle>
            <p className="text-muted-foreground text-sm">Successful payments · last 14 days</p>
          </CardHeader>
          <CardContent><LineChart data={points} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">By status</CardTitle></CardHeader>
          <CardContent><DonutChart data={statusSlices} centerLabel="payments" /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top merchants</CardTitle></CardHeader>
          <CardContent>{topBars.length ? <BarChart data={topBars} /> : <p className="text-muted-foreground text-sm">No data.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Successful by method</CardTitle></CardHeader>
          <CardContent>{methodBars.length ? <BarChart data={methodBars} /> : <p className="text-muted-foreground text-sm">No data.</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent payments</CardTitle>
          <Link href="/services/pay/payments" className="text-primary text-sm font-medium hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y">
            {recent.map((p) => (
              <div key={p.reference} className="flex items-center gap-3 px-6 py-2.5">
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full"><CreditCard className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.business ?? p.customerEmail ?? "Payment"}</div>
                  <div className="text-muted-foreground truncate font-mono text-xs">{p.reference}</div>
                </div>
                <Badge variant={statusVariant[p.status] ?? "secondary"} className="hidden sm:inline-flex">{p.status}</Badge>
                <div className="w-24 text-right text-sm font-semibold">{naira(p.amount)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
