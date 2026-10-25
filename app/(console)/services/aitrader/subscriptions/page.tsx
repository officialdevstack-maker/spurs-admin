import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { Layers } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { listSubscriptions } from "@/lib/subscriptions";
import { createSubscription } from "./actions";

export const dynamic = "force-dynamic";

export default async function AiTraderSubscriptionsPage() {
  await requirePermission("platform.ai.read");
  const subs = await listSubscriptions("aitrader");

  return (
    <div className="space-y-6">
      <PageHeader title="AI Trader subscriptions" description="Manage access plans for AI Trader customers." />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">AI Trader subscriptions</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a subscription record for a user so the AI Trader app can read their plan and access state.
            </p>
          </div>
          <span className="text-muted-foreground text-sm">
            {subs.length} record(s)
          </span>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            action={createSubscription}
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4"
          >
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">User ID</span>
              <input
                name="userId"
                required
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
                placeholder="spurs-user-sub"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Plan</span>
              <select
                name="plan"
                defaultValue="pro"
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Active</span>
              <select
                name="active"
                defaultValue="true"
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Renews on
              </span>
              <input
                name="renewsAt"
                type="date"
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              />
            </label>
            <div className="sm:col-span-4 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Create AI Trader subscription
              </button>
            </div>
          </form>

          {subs.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No AI Trader subscriptions yet"
              description="Create a subscription above to make the user visible to the trader app."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Renews</th>
                    <th className="py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr
                      key={`${s.userId}-${s.plan}`}
                      className="border-b last:border-0"
                    >
                      <td className="max-w-[240px] truncate py-2 pr-4 font-medium">
                        {s.userId}
                      </td>
                      <td className="py-2 pr-4 capitalize">{s.plan}</td>
                      <td className="py-2 pr-4">
                        {s.active ? (
                          <Badge>active</Badge>
                        ) : (
                          <Badge variant="outline">inactive</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {s.renewsAt
                          ? new Date(s.renewsAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(s.updatedAt).toLocaleDateString()}
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
