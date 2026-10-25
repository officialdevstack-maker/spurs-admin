import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { listPlans } from "@/lib/plans";
import { db, apps as appsTable } from "@/lib/db";
import { grantSubscriptionAction } from "../actions";

export const dynamic = "force-dynamic";

const inp = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";
const naira = (m: number) => "₦" + Math.round(m / 100).toLocaleString("en-NG");

export default async function GrantPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("platform.settings.manage");
  const [{ error }, plans, apps] = await Promise.all([
    searchParams,
    listPlans(),
    db.select({ id: appsTable.id, name: appsTable.name }).from(appsTable).catch(() => [] as { id: string; name: string }[]),
  ]);

  return (
    <form action={grantSubscriptionAction} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Grant a subscription</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="App">
            <select name="appId" defaultValue="aitrader" className={inp}>
              {(apps.length ? apps : [{ id: "aitrader", name: "AI Trader" }]).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
              ))}
            </select>
          </Field>
          <Field label="Plan">
            <select name="plan" defaultValue={plans.find((p) => p.priceMinorNgn > 0)?.code ?? plans[0]?.code} className={inp}>
              {plans.map((p) => (
                <option key={`${p.appId}:${p.code}`} value={p.code}>
                  {p.name} ({p.appId}) — {p.priceMinorNgn > 0 ? `${naira(p.priceMinorNgn)}/mo` : "free"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="User (Spurs id / sub)"><input name="userId" placeholder="e.g. 9f3a…-user-sub" className={inp} required /></Field>
          <Field label="Status">
            <select name="active" defaultValue="true" className={inp}>
              <option value="true">active</option>
              <option value="false">inactive</option>
            </select>
          </Field>
          <Field label="Duration (days)"><input name="days" type="number" min="1" step="1" defaultValue={30} className={inp} /></Field>
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">Grant subscription</button>
        <p className="text-muted-foreground text-xs">Manual grant — no charge. Trade allowance comes from the plan.</p>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs">{label}</span>
      {children}
    </label>
  );
}
