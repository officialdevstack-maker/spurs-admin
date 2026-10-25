import Link from "next/link";
import { Wallet, Users, ArrowLeftRight, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LineChart, { type Point } from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import ServiceFlow, { type FlowEdge } from "@/components/ServiceFlow";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import { walletStats, txnSeries, sourceBreakdown, balanceByAsset, connections } from "@/lib/wallet-data";

export const dynamic = "force-dynamic";

const naira = (k: number) => "₦" + Math.round(k / 100).toLocaleString("en-NG");

const SOURCE_COLOR: Record<string, string> = {
  top_up: "#6366f1", payment: "#f43f5e", convert: "#06b6d4", send: "#f59e0b", received: "#10b981", withdrawal: "#a855f7",
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

export default async function WalletOverview() {
  await requirePermission("money.read");
  const [stats, series, sources, assets, conn] = await Promise.all([
    walletStats(), txnSeries(14), sourceBreakdown(), balanceByAsset(), connections(),
  ]);

  const tiles = [
    { label: "NGN balances", value: naira(stats.ngnBalance), icon: Wallet, sub: `${stats.accounts} wallets` },
    { label: "Holders", value: stats.holders.toLocaleString(), icon: Users, sub: "Spurs accounts" },
    { label: "Transactions", value: stats.transactions.toLocaleString(), icon: ArrowLeftRight, sub: `${stats.fundedViaPay} funded via Pay` },
    { label: "Virtual accounts", value: stats.virtualAccounts.toLocaleString(), icon: Building2, sub: "bank inflow" },
  ];

  const points = buildPoints(series, 14);
  const sourceSlices = sources.map((s) => ({ label: s.source.replace(/_/g, " "), value: s.count, color: SOURCE_COLOR[s.source] ?? "#9ca3af" }));
  const assetBars = assets.map((a) => ({ label: a.asset, value: a.accounts, sub: "accts" }));

  const edges: FlowEdge[] = [
    { from: "accounts", to: "wallet", label: "owns", metric: `${conn.holders}`, sub: "holders" },
    { from: "pay", to: "wallet", label: "top-ups", metric: `${conn.fundedViaPay.count}`, sub: naira(conn.fundedViaPay.volume) },
    { from: "bank", to: "wallet", label: "deposits", metric: `${conn.bankDeposits.count}`, sub: naira(conn.bankDeposits.volume) },
    { from: "wallet", to: "out", label: "spend", metric: `${conn.spend.count}`, sub: naira(conn.spend.volume) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet overview" description="Balances, ledger activity, and how money flows through customer wallets." />
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
            <CardTitle className="text-base">Transactions</CardTitle>
            <p className="text-muted-foreground text-sm">Ledger entries · last 14 days</p>
          </CardHeader>
          <CardContent><LineChart data={points} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">By source</CardTitle></CardHeader>
          <CardContent><DonutChart data={sourceSlices} centerLabel="entries" /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">How money connects</CardTitle>
            <Link href="/services/wallet/connections" className="text-primary text-sm font-medium hover:underline">Details</Link>
          </CardHeader>
          <CardContent><ServiceFlow edges={edges} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Accounts by asset</CardTitle></CardHeader>
          <CardContent>{assetBars.length ? <BarChart data={assetBars} /> : <p className="text-muted-foreground text-sm">No wallets yet.</p>}</CardContent>
        </Card>
      </div>
    </div>
  );
}
