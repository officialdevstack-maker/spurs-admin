import { Building2, FileText, ArrowDownToLine, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { suiteStats, recentBusinesses } from "@/lib/suite-data";
import PageHeader from "@/components/page/PageHeader";

export const dynamic = "force-dynamic";

const naira = (k: number) => "₦" + Math.round(k / 100).toLocaleString("en-NG");

export default async function SuiteOverview() {
  const [stats, businesses] = await Promise.all([suiteStats(), recentBusinesses()]);

  const tiles = [
    { label: "Businesses", value: stats.businesses.toLocaleString(), icon: Building2, sub: `${stats.employees} employees on payroll` },
    { label: "Revenue collected", value: naira(stats.revenueMinor), icon: ArrowDownToLine, sub: `${stats.payments} payments` },
    { label: "Outstanding", value: naira(stats.outstandingMinor), icon: FileText, sub: `${stats.invoices} invoices · ${stats.paidInvoices} paid` },
    { label: "Pay runs", value: stats.payRuns.toLocaleString(), icon: ClipboardList, sub: "completed payrolls" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Suite overview" description="Business activity, collected revenue, invoices, and payroll runs." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t.label}</span>
                <t.icon className="text-muted-foreground size-4" />
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums">{t.value}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{t.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Businesses</CardTitle></CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No businesses yet — they appear here once merchants sign up on Suite. If the app is deployed and this stays empty, push the <code>suite</code> schema (<code>npm run db:push</code> in <code>suite/</code>).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Business</th>
                    <th className="py-2 pr-3 font-medium">Currency</th>
                    <th className="py-2 pr-3 text-right font-medium">Invoices</th>
                    <th className="py-2 pr-3 text-right font-medium">Revenue</th>
                    <th className="py-2 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{b.name}</td>
                      <td className="py-2.5 pr-3">{b.currency}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{b.invoices}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{naira(b.revenueMinor)}</td>
                      <td className="text-muted-foreground py-2.5 text-right text-xs">{new Date(b.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
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
