import Link from "next/link";
import { Users, Activity, Wallet, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import { aitrader } from "@/lib/aitrader";

export const dynamic = "force-dynamic";

const usd = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default async function AiTraderOverview() {
  await requirePermission("platform.ai.read");
  const [users, platform] = await Promise.all([aitrader.users(), aitrader.platform()]);
  const offline = platform === null && users.length === 0;

  const active = users.filter((u) => u.active).length;
  const totalEquity = users.reduce((s, u) => s + (u.status?.equity ?? 0), 0);
  const totalPositions = users.reduce((s, u) => s + (u.status?.open_positions ?? 0), 0);
  const live = users.filter((u) => !u.config.dry_run).length;

  const tiles = [
    { label: "Users", value: String(users.length), icon: Users, sub: `${active} engines running` },
    { label: "Aggregate equity", value: usd(totalEquity), icon: Wallet, sub: "across all users" },
    { label: "Open positions", value: String(totalPositions), icon: Activity, sub: "platform-wide" },
    { label: "Live traders", value: String(live), icon: ShieldCheck, sub: platform?.allow_live ? "live enabled" : "live disabled" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="AI Trader overview" description="Monitor trader accounts, equity, and open positions." />
      {offline && (
        <Card className="border-amber-300 dark:border-amber-900">
          <CardContent className="py-4 text-sm text-amber-700 dark:text-amber-300">
            Trading service unreachable. Start it (<code>python -m service</code>) and set <code>TRADER_SERVICE_URL</code> +
            <code> AITRADER_ADMIN_SECRET</code> under Credentials for app <b>aitrader</b>.
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent users</CardTitle>
          <Link href="/services/aitrader/users" className="text-primary text-sm font-medium hover:underline">All users</Link>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-4">User</th><th className="py-2 pr-4">Venue</th>
                    <th className="py-2 pr-4">State</th><th className="py-2 pr-4">Equity</th><th className="py-2">Positions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 8).map((u) => (
                    <tr key={u.user_id} className="border-b last:border-0">
                      <td className="max-w-[200px] truncate py-2 pr-4 font-medium">{u.name}</td>
                      <td className="py-2 pr-4">{u.config.mode}{u.config.dry_run ? "" : " · live"}</td>
                      <td className="py-2 pr-4">{u.active ? <Badge>running</Badge> : <Badge variant="outline">idle</Badge>}</td>
                      <td className="py-2 pr-4">{u.status?.equity != null ? usd(u.status.equity) : "—"}</td>
                      <td className="py-2">{u.status?.open_positions ?? 0}</td>
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
