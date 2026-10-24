import Link from "next/link";
import {
  Users, CreditCard, Wallet, Boxes, ArrowUpRight, ArrowDownRight, Landmark,
  Globe, TrendingUp, Activity, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VolumeBarChart, { type Bar } from "@/components/charts/VolumeBarChart";
import { platformStats, paymentSeries, listPayments, listTransactions } from "@/lib/data";

const naira = (kobo: number) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
const nairaMajor = (v: number) => "₦" + Math.round(v).toLocaleString("en-NG");

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", pending: "warning", failed: "destructive",
  refunded: "secondary", partially_refunded: "secondary",
};

/** Fill a continuous run of `days` daily buckets ending today. */
function buildBars(series: { t: number; v: number }[], days: number): Bar[] {
  const byDay = new Map<string, number>();
  for (const p of series) {
    const key = new Date(p.t).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + p.v);
  }
  const out: Bar[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      full: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }),
      value: byDay.get(key) ?? 0,
    });
  }
  return out;
}

export default async function Overview() {
  const [stats, series, payments, txns] = await Promise.all([
    platformStats(), paymentSeries(30), listPayments(6), listTransactions(6),
  ]);

  const bars = buildBars(series, 30);
  const net = stats.collected - stats.refunded - stats.paidOut;
  const successRate = stats.successful + stats.failed > 0
    ? (stats.successful / (stats.successful + stats.failed)) * 100 : 0;
  const last7 = bars.slice(-7).reduce((s, b) => s + b.value, 0);
  const prev7 = bars.slice(-14, -7).reduce((s, b) => s + b.value, 0);
  const wow = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null;

  const kpis = [
    {
      label: "Net collected", value: naira(net), icon: TrendingUp,
      sub: wow === null ? "no prior week" : `${wow >= 0 ? "+" : ""}${wow.toFixed(0)}% vs last week`,
      up: (wow ?? 0) >= 0,
    },
    { label: "Total users", value: stats.users.toLocaleString(), icon: Users,
      sub: `${stats.wallets} wallets · ${stats.merchants} merchants`, up: true },
    { label: "Wallet balances", value: naira(stats.walletNgn), icon: Wallet,
      sub: `${stats.txnsCount.toLocaleString()} transactions`, up: true },
    { label: "Payment success", value: `${successRate.toFixed(1)}%`, icon: CheckCircle2,
      sub: `${stats.successful} ok · ${stats.failed} failed`, up: successRate >= 80 },
  ];

  const flow = [
    { label: "Collected", value: stats.collected, tone: "bg-emerald-500" },
    { label: "Refunded", value: stats.refunded, tone: "bg-amber-500" },
    { label: "Paid out", value: stats.paidOut, tone: "bg-sky-500" },
  ];
  const flowMax = Math.max(1, ...flow.map((f) => f.value));

  const modeTotal = stats.live.count + stats.test.count || 1;
  const livePct = (stats.live.count / modeTotal) * 100;

  const services = [
    { name: "Pay", icon: CreditCard, href: "/services/pay",
      stat: naira(stats.collected), sub: `${stats.paymentsCount} payments` },
    { name: "Wallet", icon: Wallet, href: "/services/wallet",
      stat: stats.wallets.toLocaleString(), sub: `${stats.txnsCount} transactions` },
    { name: "Cloud (BaaS)", icon: Boxes, href: "/services/cloud",
      stat: stats.projects.toLocaleString(), sub: "projects" },
    { name: "Payouts", icon: ArrowUpRight, href: "/payments",
      stat: naira(stats.paidOut), sub: `${stats.payoutsCount} payouts` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm">Everything across Spurs Cloud, in one place.</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Activity className="size-3" /> Live · {new Date().toLocaleString("en-NG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
        </Badge>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{k.label}</CardTitle>
              <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg">
                <k.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold tracking-tight">{k.value}</div>
              <div className={"flex items-center gap-1 text-xs " + (k.up ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                {k.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                <span className="text-muted-foreground">{k.sub}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + side panel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Successful volume</CardTitle>
              <p className="text-muted-foreground text-sm">Daily collected payments · last 30 days</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{nairaMajor(last7)}</div>
              <div className="text-muted-foreground text-xs">last 7 days</div>
            </div>
          </CardHeader>
          <CardContent>
            <VolumeBarChart data={bars} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Money flow</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {flow.map((f) => (
                <div key={f.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium tabular-nums">{naira(f.value)}</span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div className={"h-full rounded-full " + f.tone} style={{ width: `${(f.value / flowMax) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t pt-3 text-sm">
                <span className="font-medium">Net</span>
                <span className="font-bold tabular-nums">{naira(net)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Live vs test</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full" style={{ width: `${livePct}%` }} />
                <div className="bg-primary/30 h-full" style={{ width: `${100 - livePct}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5"><span className="bg-primary size-2.5 rounded-full" /> Live</span>
                <span className="font-medium">{stats.live.count} · {naira(stats.live.volume)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5"><span className="bg-primary/30 size-2.5 rounded-full" /> Test</span>
                <span className="font-medium">{stats.test.count} · {naira(stats.test.volume)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <Link key={s.name} href={s.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">{s.name}</div>
                  <div className="truncate text-lg font-bold tracking-tight">{s.stat}</div>
                  <div className="text-muted-foreground truncate text-xs">{s.sub}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent payments</CardTitle>
            <Link href="/payments" className="text-primary text-sm font-medium hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="px-0">
            {payments.length === 0 ? (
              <p className="text-muted-foreground px-6 py-8 text-center text-sm">No payments yet.</p>
            ) : (
              <div className="divide-y">
                {payments.map((p) => (
                  <div key={p.reference} className="flex items-center gap-3 px-6 py-2.5">
                    <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full">
                      <CreditCard className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.business ?? p.customerEmail ?? "Payment"}</div>
                      <div className="text-muted-foreground truncate font-mono text-xs">{p.reference}</div>
                    </div>
                    <Badge variant={statusVariant[p.status] ?? "secondary"} className="hidden sm:inline-flex">{p.status}</Badge>
                    <div className="w-20 text-right text-sm font-semibold">{naira(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent wallet activity</CardTitle>
            <Link href="/transactions" className="text-primary text-sm font-medium hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="px-0">
            {txns.length === 0 ? (
              <p className="text-muted-foreground px-6 py-8 text-center text-sm">No transactions yet.</p>
            ) : (
              <div className="divide-y">
                {txns.map((t) => {
                  const credit = t.direction === "credit";
                  return (
                    <div key={t.reference} className="flex items-center gap-3 px-6 py-2.5">
                      <span className={"grid size-8 shrink-0 place-items-center rounded-full " + (credit ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                        {credit ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{t.userEmail ?? t.userId}</div>
                        <div className="text-muted-foreground truncate text-xs capitalize">{t.source.replace(/_/g, " ")}</div>
                      </div>
                      <div className={"text-sm font-semibold tabular-nums " + (credit ? "text-emerald-600 dark:text-emerald-400" : "")}>
                        {credit ? "+" : "−"}{t.amount} {t.asset}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
