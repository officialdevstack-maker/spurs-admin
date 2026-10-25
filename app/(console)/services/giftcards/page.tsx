import Link from "next/link";
import {
  Gift, Ticket, Wallet, ShieldAlert, TrendingUp, TriangleAlert, ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import { giftcards, naira } from "@/lib/sdk/giftcards";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  card_redeem: "Gift cards redeemed",
  trade_payout: "Card sales (credit)",
  survey_points: "Spurs Earn points",
  purchase: "Bought directly",
  refund: "Refunds",
  adjustment: "Adjustments",
};

export default async function GiftcardsOverview() {
  await requirePermission("money.read");
  const [stats, series, breakage, sources] = await Promise.all([
    giftcards.stats(), giftcards.series(14), giftcards.breakage(90), giftcards.creditSources(90),
  ]);

  const tiles = [
    { label: "Cards issued", value: stats.cardsIssued.toLocaleString(), Icon: Ticket,
      hint: `${naira(stats.issuedMinor)} face value` },
    { label: "Unspent on cards", value: naira(stats.outstandingMinor), Icon: Gift,
      hint: `${stats.cardsUnused.toLocaleString()} cards not yet redeemed` },
    { label: "Credit outstanding", value: naira(stats.creditLiabilityMinor), Icon: Wallet,
      hint: `${naira(stats.creditSpentMinor)} spent all time` },
    { label: "Paid for cards", value: naira(stats.tradesPaidMinor), Icon: ArrowLeftRight,
      hint: "Third-party cards bought from users" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Gift cards overview" description="Card liabilities, trade activity, and customer credit across gift cards." />
      {/* Liability first — this is the number that matters to finance. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t.label}</span>
                <t.Icon className="text-muted-foreground size-4" />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</div>
              <p className="text-muted-foreground mt-1 text-xs">{t.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats.tradesAwaitingReview > 0 || stats.jobsOverdue > 0 || stats.jobsFailed > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/services/giftcards/review">
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardContent className="flex items-center gap-3 pt-6">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  stats.tradesAwaitingReview > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <ShieldAlert className="size-5" />
                </span>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{stats.tradesAwaitingReview}</div>
                  <p className="text-muted-foreground text-xs">Cards awaiting review</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                stats.jobsOverdue > 0 ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
              }`}>
                <TriangleAlert className="size-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{stats.jobsOverdue}</div>
                <p className="text-muted-foreground text-xs">
                  Jobs overdue {stats.jobsOverdue > 0 && "— is the scheduler running?"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                stats.jobsFailed > 0 ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"
              }`}>
                <TriangleAlert className="size-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{stats.jobsFailed}</div>
                <p className="text-muted-foreground text-xs">Jobs failed after retries</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cards sold, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={series.map((p) => ({
                label: p.date.slice(5),
                full: p.date,
                value: Math.round(Number(p.soldMinor) / 100),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where credit comes from</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">Last 90 days.</p>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No credit issued yet.</p>
            ) : (
              <BarChart data={sources.map((s) => ({
                label: SOURCE_LABEL[s.source] ?? s.source.replace(/_/g, " "),
                value: Math.round(Number(s.totalMinor) / 100),
                sub: "₦",
              }))} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Where credit gets spent</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Last 90 days, by app. Credit that's never spent stays on our books as a liability.
            </p>
          </div>
          <Link href="/services/giftcards/breakage">
            <Badge variant="outline" className="gap-1.5"><TrendingUp className="size-3" /> Full report</Badge>
          </Link>
        </CardHeader>
        <CardContent>
          {breakage.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No credit has been spent yet.
            </p>
          ) : (
            <BarChart data={breakage.map((b) => ({
              label: b.app,
              value: Math.round(Number(b.spentMinor) / 100),
              sub: `₦ · ${b.spendCount} spends`,
            }))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
