import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanRecord } from "@/lib/plans";

const inp = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";

export function PlanForm({
  plan, action, error,
}: { plan?: PlanRecord; action: (fd: FormData) => void; error?: string }) {
  const editing = !!plan;
  return (
    <form action={action} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>
      )}
      {editing && <input type="hidden" name="id" value={plan.id} />}
      {editing && <input type="hidden" name="appId" value={plan.appId} />}
      {editing && <input type="hidden" name="code" value={plan.code} />}

      <Card>
        <CardHeader><CardTitle className="text-base">{editing ? `Edit plan — ${plan.name}` : "New plan"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="App"><input value={plan.appId} className={inp} disabled /></Field>
              <Field label="Code"><input value={plan.code} className={inp} disabled /></Field>
            </>
          ) : (
            <>
              <Field label="App"><input name="appId" defaultValue="aitrader" className={inp} /></Field>
              <Field label="Code (slug, unique per app)"><input name="code" placeholder="pro" className={inp} required /></Field>
            </>
          )}
          <Field label="Name"><input name="name" defaultValue={plan?.name ?? ""} placeholder="Pro" className={inp} required /></Field>
          <Field label="Price (₦ / month, 0 = free)"><input name="priceNgn" type="number" min="0" step="1" defaultValue={plan ? plan.priceMinorNgn / 100 : 0} className={inp} /></Field>
          <Field label="Trade limit (0 = unlimited)"><input name="tradeLimit" type="number" min="0" step="1" defaultValue={plan?.tradeLimit ?? 0} className={inp} /></Field>
          <Field label="Trade period">
            <select name="tradePeriod" defaultValue={plan?.tradePeriod ?? "month"} className={inp}>
              <option value="day">day</option><option value="week">week</option><option value="month">month</option>
            </select>
          </Field>
          <Field label="Sort order"><input name="sortOrder" type="number" step="1" defaultValue={plan?.sortOrder ?? 0} className={inp} /></Field>
          <Field label="Visibility">
            <select name="active" defaultValue={String(plan?.active ?? true)} className={inp}>
              <option value="true">active (shown to users)</option>
              <option value="false">hidden</option>
            </select>
          </Field>
          <Field label="Default plan">
            <select name="isDefault" defaultValue={String(plan?.isDefault ?? false)} className={inp}>
              <option value="false">no</option>
              <option value="true">yes — fallback for users with no subscription</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Features (one per line)">
              <textarea name="features" rows={5} defaultValue={plan?.features.join("\n") ?? ""}
                className="w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus:border-primary" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
          {editing ? "Save plan" : "Create plan"}
        </button>
        <p className="text-muted-foreground text-xs">Active plans appear in the app's subscription page automatically.</p>
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
