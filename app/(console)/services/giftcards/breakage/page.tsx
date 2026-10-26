import { PieChart, Wallet, TrendingDown, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BarChart from "@/components/charts/BarChart";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import { giftcards, naira } from "@/lib/sdk/giftcards";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  card_redeem: "Gift cards redeemed",
  trade_payout: "Card sales taken as credit",
  survey_points: "Spurs Earn points converted",
  purchase: "Bought directly",
  refund: "Refunds",
  adjustment: "Adjustments",
};

/**
 * Breakage: credit that was issued but never spent. It sits on our books as a
 * liability until it's redeemed — and the share that never gets spent is,
 * commercially, the margin of the whole closed-loop model.
 */
export default async function Breakage() {
  await requirePermission("money.read");
  const [stats, spent, sources] = await Promise.all([
    giftcards.stats(), giftcards.breakage(365), giftcards.creditSources(365),
  ]);

  const issued = sources.reduce((s, r) => s + Number(r.totalMinor), 0);
  const used = spent.reduce((s, r) => s + Number(r.spentMinor), 0);
  const outstanding = Number(stats.creditLiabilityMinor);
  const spendRate = issued > 0 ? Math.round((used / issued) * 100) : 0;

  const tiles = [
    { label: "Credit issued", value: naira(String(issued)), Icon: Wallet, hint: "Last 12 months" },
    { label: "Credit spent", value: naira(String(used)), Icon: TrendingDown, hint: `${spendRate}% of what we issued` },
    { label: "Still outstanding", value: naira(String(outstanding)), Icon: PieChart, hint: "Our liability today" },
    { label: "Unspent on cards", value: naira(stats.outstandingMinor), Icon: PieChart, hint: `${stats.cardsUnused} cards never redeemed` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Gift card breakage" description="Track outstanding customer credit as a liability and see where it is spent." />
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

      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Outstanding credit is a real liability, not revenue — it&apos;s value we owe in goods. Treat the
          unspent balance as money still owed until it&apos;s either spent or written off under whatever
          policy finance sets. Nothing here writes any of it off automatically.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where credit came from</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">Last 12 months.</p>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No credit issued yet.</p>
            ) : (
              <BarChart data={sources.map((s) => ({
                label: SOURCE_LABEL[s.source] ?? s.source.replace(/_/g, " "),
                value: Math.round(Number(s.totalMinor) / 100),
                sub: `₦ · ${s.count}`,
              }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where it was spent</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">By Spurs app, last 12 months.</p>
          </CardHeader>
          <CardContent>
            {spent.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No credit has been spent yet — every naira issued is still outstanding.
              </p>
            ) : (
              <BarChart data={spent.map((s) => ({
                label: s.app,
                value: Math.round(Number(s.spentMinor) / 100),
                sub: `₦ · ${s.spendCount}`,
              }))} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
