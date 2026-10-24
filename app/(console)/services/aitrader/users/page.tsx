import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { aitrader } from "@/lib/aitrader";

export const dynamic = "force-dynamic";

const usd = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default async function AiTraderUsers() {
  await requireAdmin();
  const users = await aitrader.users();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Trader users</CardTitle>
          <span className="text-muted-foreground text-sm">{users.length} total</span>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users yet. Users appear here once they configure the trader.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Venue</th>
                    <th className="py-2 pr-4">Broker</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">State</th>
                    <th className="py-2 pr-4">Equity</th>
                    <th className="py-2 pr-4">Positions</th>
                    <th className="py-2">Symbols</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const connected = u.connection.bybit_configured || u.connection.mt5_configured;
                    return (
                      <tr key={u.user_id} className="border-b last:border-0">
                        <td className="max-w-[220px] py-2 pr-4">
                          <div className="truncate font-medium">{u.name}</div>
                          {u.name !== u.user_id && <div className="text-muted-foreground truncate text-xs">{u.user_id}</div>}
                        </td>
                        <td className="py-2 pr-4">{u.config.mode}</td>
                        <td className="py-2 pr-4">
                          {connected ? <Badge>connected</Badge> : <Badge variant="outline">none</Badge>}
                        </td>
                        <td className="py-2 pr-4">
                          {u.config.dry_run ? <Badge variant="outline">dry-run</Badge> : <Badge>live</Badge>}
                        </td>
                        <td className="py-2 pr-4">{u.active ? "running" : "idle"}</td>
                        <td className="py-2 pr-4">{u.status?.equity != null ? usd(u.status.equity) : "—"}</td>
                        <td className="py-2 pr-4">{u.status?.open_positions ?? 0}</td>
                        <td className="text-muted-foreground max-w-[180px] truncate py-2">{u.config.symbols.join(", ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        Users bring their own broker credentials — these are never visible to admins. This view shows only status and settings.
      </p>
    </div>
  );
}
