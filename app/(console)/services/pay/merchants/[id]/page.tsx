import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Hash, CalendarDays, Webhook, KeyRound, Building2, CreditCard, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requirePermission } from "@/lib/auth";
import { getMerchant } from "@/lib/pay-data";

export const dynamic = "force-dynamic";

const naira = (k: number, cur = "NGN") => (cur === "NGN" ? "₦" : cur + " ") + (k / 100).toLocaleString("en-NG");
const date = (s: string) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const sv: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", pending: "warning", failed: "destructive", refunded: "secondary", partially_refunded: "secondary",
};

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("money.read");
  const { id } = await params;
  const m = await getMerchant(id);
  if (!m) notFound();

  const initials = (m.business ?? m.email ?? "M").slice(0, 2).toUpperCase();
  const stats = [
    { label: "Collected", value: naira(m.stats.collected) },
    { label: "Paid out", value: naira(m.stats.paidOut) },
    { label: "Refunded", value: naira(m.stats.refunded) },
    { label: "Payments", value: m.stats.payments.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <Link href="/services/pay/merchants" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> Back to merchants
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <Avatar className="size-14"><AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{m.business ?? "Unnamed merchant"}</h2>
              <Badge variant="secondary"><KeyRound className="size-3" /> {m.stats.apiKeys} API keys</Badge>
              {m.stats.virtualAccounts > 0 && <Badge variant="outline"><Building2 className="size-3" /> {m.stats.virtualAccounts} VAs</Badge>}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" /> {m.email ?? "—"}</span>
              <span className="inline-flex items-center gap-1.5"><Hash className="size-3.5" /> <span className="font-mono text-xs">{m.id}</span></span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Joined {date(m.createdAt)}</span>
              {m.webhookUrl && <span className="inline-flex items-center gap-1.5"><Webhook className="size-3.5" /> webhook set</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-muted-foreground text-sm font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold tracking-tight">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4" /> Recent payments</CardTitle></CardHeader>
          <CardContent className="px-0">
            {m.recentPayments.length === 0 ? <p className="text-muted-foreground px-6 py-6 text-center text-sm">No payments.</p> : (
              <div className="divide-y">
                {m.recentPayments.map((p) => (
                  <div key={p.reference} className="flex items-center gap-3 px-6 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.customerEmail ?? "Payment"}</div>
                      <div className="text-muted-foreground truncate font-mono text-xs">{p.reference}</div>
                    </div>
                    <Badge variant={sv[p.status] ?? "secondary"} className="hidden sm:inline-flex">{p.status}</Badge>
                    <div className="w-24 text-right text-sm font-semibold">{naira(p.amount, p.currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ArrowUpRight className="size-4" /> Recent payouts</CardTitle></CardHeader>
          <CardContent className="px-0">
            {m.recentPayouts.length === 0 ? <p className="text-muted-foreground px-6 py-6 text-center text-sm">No payouts.</p> : (
              <div className="divide-y">
                {m.recentPayouts.map((p) => (
                  <div key={p.reference} className="flex items-center gap-3 px-6 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.recipient ?? "Payout"}</div>
                      <div className="text-muted-foreground truncate font-mono text-xs">{p.reference}</div>
                    </div>
                    <Badge variant={sv[p.status] ?? "secondary"} className="hidden sm:inline-flex">{p.status}</Badge>
                    <div className="w-24 text-right text-sm font-semibold">{naira(p.amount, p.currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
