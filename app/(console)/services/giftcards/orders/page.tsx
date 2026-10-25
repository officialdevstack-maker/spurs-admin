import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page/PageHeader";
import Pagination from "@/components/Pagination";
import { requirePermission } from "@/lib/auth";
import { giftcards, naira } from "@/lib/sdk/giftcards";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const when = (s: string) =>
  new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  fulfilled: "default", paid: "default", pending: "secondary", failed: "destructive", cancelled: "outline",
};

export default async function Orders({ searchParams }: { searchParams: Promise<{ page?: string; t?: string }> }) {
  await requirePermission("money.read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const tPage = Math.max(1, Number(sp.t) || 1);

  const [orders, trades] = await Promise.all([giftcards.recentOrders(200), giftcards.recentTrades(200)]);
  const ordersPage = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const tradesPage = trades.slice((tPage - 1) * PAGE_SIZE, tPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader title="Gift card orders" description={`${orders.length} card purchases and ${trades.length} user trades.`} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4" /> Card purchases
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">Spurs cards bought by users.</p>
        </CardHeader>
        <CardContent className="px-0">
          {orders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="px-5 py-2 font-medium">Buyer</th>
                    <th className="px-5 py-2 font-medium">Product</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Total</th>
                    <th className="px-5 py-2 font-medium">When</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ordersPage.map((o) => (
                    <tr key={o.id}>
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{o.name ?? "Spurs user"}</div>
                        <div className="text-muted-foreground text-xs">{o.email ?? o.userId}</div>
                      </td>
                      <td className="px-5 py-2.5">{o.product ?? "—"}</td>
                      <td className="px-5 py-2.5 tabular-nums">{o.quantity}</td>
                      <td className="px-5 py-2.5 font-medium tabular-nums">{naira(o.totalMinor)}</td>
                      <td className="text-muted-foreground px-5 py-2.5">{when(o.createdAt)}</td>
                      <td className="px-5 py-2.5">
                        <Badge variant={STATUS[o.status] ?? "outline"} className="capitalize">{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5">
                <Pagination page={page} pageSize={PAGE_SIZE} total={orders.length}
                  basePath="/services/giftcards/orders" params={{ t: sp.t }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cards bought from users</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">Every third-party trade, whatever its outcome.</p>
        </CardHeader>
        <CardContent className="px-0">
          {trades.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No trades yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="px-5 py-2 font-medium">Seller</th>
                    <th className="px-5 py-2 font-medium">Card</th>
                    <th className="px-5 py-2 font-medium">Payout</th>
                    <th className="px-5 py-2 font-medium">Amount</th>
                    <th className="px-5 py-2 font-medium">When</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tradesPage.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{t.name ?? "Spurs user"}</div>
                        <div className="text-muted-foreground text-xs">{t.email ?? t.userId}</div>
                      </td>
                      <td className="px-5 py-2.5">{t.brand} · {t.faceValue} {t.faceCurrency}</td>
                      <td className="px-5 py-2.5 capitalize">{t.payoutType}</td>
                      <td className="px-5 py-2.5 font-medium tabular-nums">{naira(t.quotedMinor)}</td>
                      <td className="text-muted-foreground px-5 py-2.5">{when(t.createdAt)}</td>
                      <td className="px-5 py-2.5">
                        <Badge variant={t.status === "paid" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}
                          className="capitalize">{t.status.replace(/_/g, " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5">
                <Pagination page={tPage} pageSize={PAGE_SIZE} total={trades.length} paramName="t"
                  basePath="/services/giftcards/orders" params={{ page: sp.page }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
