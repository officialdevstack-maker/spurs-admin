import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { requirePermission } from "@/lib/auth";
import { listPlans } from "@/lib/plans";
import { deletePlanAction } from "./actions";

export const dynamic = "force-dynamic";

const naira = (minor: number) => "₦" + Math.round(minor / 100).toLocaleString("en-NG");

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  await requirePermission("platform.settings.manage");
  const [{ saved, deleted }, plans] = await Promise.all([searchParams, listPlans()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription plans"
        description="Manage the plans offered across Spurs services."
        actions={
          <Link href="/subscriptions/new" className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90">
            <Plus className="size-4" /> New plan
          </Link>
        }
      />
      {saved && <Banner tone="ok">Plan saved.</Banner>}
      {deleted && <Banner tone="ok">Plan deleted.</Banner>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Plans</CardTitle></CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No subscription plans yet"
              description="Create a plan to make it available on the app's subscription page."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">App</th>
                    <th className="py-2 pr-4">Price</th><th className="py-2 pr-4">Trades</th>
                    <th className="py-2 pr-4">Active</th><th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{p.name}</span>
                        {p.isDefault && <Badge className="ml-2">default</Badge>}
                      </td>
                      <td className="text-muted-foreground py-2 pr-4">{p.code}</td>
                      <td className="py-2 pr-4">{p.appId}</td>
                      <td className="py-2 pr-4">{p.priceMinorNgn === 0 ? "Free" : `${naira(p.priceMinorNgn)}/mo`}</td>
                      <td className="py-2 pr-4">{p.tradeLimit === 0 ? "unlimited" : `${p.tradeLimit}/${p.tradePeriod}`}</td>
                      <td className="py-2 pr-4">{p.active ? <Badge>active</Badge> : <Badge variant="outline">hidden</Badge>}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/subscriptions/${p.id}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"><Pencil className="size-3.5" /> Edit</Link>
                          <form action={deletePlanAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="text-muted-foreground hover:text-red-600 inline-flex items-center gap-1 text-xs"><Trash2 className="size-3.5" /> Delete</button>
                          </form>
                        </div>
                      </td>
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

function Banner({ tone, children }: { tone: "ok"; children: React.ReactNode }) {
  return (
    <div className={tone === "ok" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : ""}>
      {children}
    </div>
  );
}
