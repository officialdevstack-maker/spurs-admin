import { Sparkles, Users, BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { listSubscriptions } from "@/lib/subscriptions";
import { listPlans } from "@/lib/plans";

export const dynamic = "force-dynamic";

const naira = (minor: number) => "₦" + Math.round(minor / 100).toLocaleString("en-NG");

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ granted?: string }> }) {
  await requireAdmin();
  const [{ granted }, subs, plans] = await Promise.all([searchParams, listSubscriptions(), listPlans()]);
  const price = new Map(plans.map((p) => [`${p.appId}:${p.code}`, p.priceMinorNgn] as const));

  const active = subs.filter((s) => s.active);
  const mrr = active.reduce((sum, s) => sum + (price.get(`${s.appId}:${s.plan}`) ?? 0), 0);

  return (
    <div className="space-y-6">
      {granted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Subscription granted.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Active subscribers" value={String(active.length)} icon={<Users className="size-4" />} sub={`${subs.length} total records`} />
        <Tile label="Monthly recurring" value={naira(mrr)} icon={<BadgeCheck className="size-4" />} sub="from active plans" />
        <Tile label="Plans" value={String(plans.length)} icon={<Sparkles className="size-4" />} sub={`${plans.filter((p) => p.active).length} active`} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Subscribers</CardTitle></CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No subscriptions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-4">User</th><th className="py-2 pr-4">App</th>
                    <th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Trades</th><th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Renews</th><th className="py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="max-w-[220px] truncate py-2 pr-4 font-medium">{s.userId}</td>
                      <td className="py-2 pr-4">{s.appId}</td>
                      <td className="py-2 pr-4 capitalize">{s.plan}</td>
                      <td className="py-2 pr-4">{s.tradeLimit === 0 ? "unlimited" : `${s.tradeLimit}/${s.tradePeriod}`}</td>
                      <td className="py-2 pr-4">{s.active ? <Badge>active</Badge> : <Badge variant="outline">lapsed</Badge>}</td>
                      <td className="py-2 pr-4">{s.renewsAt ? new Date(s.renewsAt).toLocaleDateString() : "—"}</td>
                      <td className="text-muted-foreground py-2">{new Date(s.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-muted-foreground mt-1 truncate text-xs">{sub}</div>
      </CardContent>
    </Card>
  );
}
