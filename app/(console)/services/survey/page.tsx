import Link from "next/link";
import {
  Users, ClipboardList, Coins, Hourglass, ShieldAlert, Ban, TrendingUp, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import { requirePermission } from "@/lib/auth";
import { survey } from "@/lib/sdk/survey";

export const dynamic = "force-dynamic";

const naira = (kobo: number) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
const usd = (v: number) => "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default async function SurveyOverview() {
  await requirePermission("money.read");
  const [stats, series, levels, revenue] = await Promise.all([
    survey.stats(), survey.series(14), survey.levelDistribution(), survey.revenue(30),
  ]);

  const margin = revenue.reduce((s, r) => s + r.marginUsd, 0);
  const gross = revenue.reduce((s, r) => s + r.grossUsd, 0);

  const tiles = [
    { label: "Earners", value: stats.users.toLocaleString(), Icon: Users, hint: `${stats.tasksLive} tasks live` },
    { label: "Submissions", value: stats.submissions.toLocaleString(), Icon: ClipboardList, hint: `${stats.approvalRate}% approved` },
    { label: "Points outstanding", value: stats.pointsOutstanding.toLocaleString(), Icon: Coins, hint: `${stats.pointsPaid.toLocaleString()} paid out all time` },
    { label: "Held in cash-outs", value: naira(stats.heldMinor), Icon: Hourglass, hint: `${stats.cashoutsPending} to review · ${stats.cashoutsOnHold} counting down` },
  ];

  const queues = [
    { label: "Cash-outs awaiting review", value: stats.cashoutsPending, href: "/services/survey/cashouts", Icon: Wallet },
    { label: "Submissions awaiting review", value: stats.pendingReview, href: "/services/survey/review", Icon: ClipboardList },
    { label: "Flagged by anti-cheat", value: stats.flagged, href: "/services/survey/risk", Icon: ShieldAlert },
    { label: "Restricted or banned", value: stats.banned, href: "/services/survey/earners", Icon: Ban },
  ];

  return (
    <div className="space-y-6">
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

      {/* What needs a human */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((q) => (
          <Link key={q.label} href={q.href}>
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardContent className="flex items-center gap-3 pt-6">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  q.value > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <q.Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-2xl font-semibold tabular-nums">{q.value}</div>
                  <p className="text-muted-foreground truncate text-xs">{q.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Submissions, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={series.map((p) => ({
                label: p.date.slice(5),
                full: p.date,
                value: p.submissions,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by level</CardTitle>
          </CardHeader>
          <CardContent>
            {levels.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No earners yet.</p>
            ) : (
              <BarChart data={levels.map((l) => ({ label: `Level ${l.level}`, value: l.users }))} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Network revenue, last 30 days</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              What the external survey networks paid us, what went to users, and what we kept.
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <TrendingUp className="size-3" /> {usd(margin)} margin
          </Badge>
        </CardHeader>
        <CardContent>
          {revenue.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No network conversions yet. Connect a network under <Link href="/services/survey/networks" className="underline">Networks</Link>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Network</th>
                    <th className="py-2 pr-4 font-medium">Completions</th>
                    <th className="py-2 pr-4 font-medium">Gross</th>
                    <th className="py-2 pr-4 font-medium">To users</th>
                    <th className="py-2 pr-4 font-medium">Our margin</th>
                    <th className="py-2 font-medium">Points issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {revenue.map((r) => (
                    <tr key={r.provider}>
                      <td className="py-2.5 pr-4 font-medium capitalize">{r.provider}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{r.completions.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{usd(r.grossUsd)}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{usd(r.userUsd)}</td>
                      <td className="py-2.5 pr-4 font-medium tabular-nums">{usd(r.marginUsd)}</td>
                      <td className="py-2.5 tabular-nums">{r.points.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="text-muted-foreground">
                    <td className="py-2.5 pr-4 font-medium">Total</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {revenue.reduce((s, r) => s + r.completions, 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{usd(gross)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{usd(gross - margin)}</td>
                    <td className="text-foreground py-2.5 pr-4 font-semibold tabular-nums">{usd(margin)}</td>
                    <td className="py-2.5" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
