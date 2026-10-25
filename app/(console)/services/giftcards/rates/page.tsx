import { Percent, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import { requirePermission } from "@/lib/auth";
import { giftcards } from "@/lib/sdk/giftcards";
import { setRateAction, upsertBrandAction } from "../actions";

export const dynamic = "force-dynamic";

const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never";

export default async function Rates() {
  await requirePermission("money.rates.manage");
  const rows = await giftcards.rates();

  return (
    <div className="space-y-6">
      <PageHeader title="Gift card rates" description="Manage buying rates, bonus credit, and the brands available to customers." />
      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Rates are data, not code — saving one publishes it immediately, with no deploy. The old rate
          is retired rather than overwritten, so a trade quoted last week can still be explained by the
          rate that applied when it was made.
        </p>
      </div>

      {rows.length === 0 && (
        <EmptyState title="No gift card brands configured" description="Add a brand and publish its first rate below." />
      )}
      {rows.map((r) => {
        const perUnit = r.buyMinorPerUnit ? Number(r.buyMinorPerUnit) / 100 : "";
        return (
          <Card key={r.brandId}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {r.brand}
                  <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Buying" : "Paused"}</Badge>
                  {r.autoVerify && (
                    <Badge variant="outline" className="gap-1 text-emerald-600">
                      <ShieldCheck className="size-3" /> auto-verify
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  {r.notes ?? "No notes"} · needs {r.requires} · rate set {when(r.rateSetAt)}
                  {r.updatedBy ? ` by ${r.updatedBy}` : ""}
                </p>
              </div>
              {r.buyMinorPerUnit && (
                <div className="text-right">
                  <div className="font-semibold tabular-nums">
                    ₦{Number(perUnit).toLocaleString()}/{r.faceCurrency ?? "USD"}
                  </div>
                  <p className="text-muted-foreground text-xs">+{r.creditBonusPct}% as credit</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form action={setRateAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <input type="hidden" name="brandId" value={r.brandId} />

                <div className="space-y-1.5">
                  <Label htmlFor={`${r.slug}-rate`}>Naira per unit</Label>
                  <Input id={`${r.slug}-rate`} name="buyPerUnit" defaultValue={String(perUnit)} inputMode="decimal" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${r.slug}-bonus`}>Credit bonus %</Label>
                  <Input id={`${r.slug}-bonus`} name="creditBonusPct" defaultValue={String(r.creditBonusPct ?? 8)} inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${r.slug}-cur`}>Face currency</Label>
                  <Input id={`${r.slug}-cur`} name="faceCurrency" defaultValue={r.faceCurrency ?? "USD"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${r.slug}-min`}>Min face</Label>
                  <Input id={`${r.slug}-min`} name="minFace" defaultValue={String(r.minFace ?? 5)} inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${r.slug}-max`}>Max face</Label>
                  <Input id={`${r.slug}-max`} name="maxFace" defaultValue={String(r.maxFace ?? 500)} inputMode="numeric" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Publish rate</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="size-4" /> Add or edit a brand
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            A brand only appears to users once it has a live rate. Leave auto-verify off unless a real
            balance check is wired up for it — it's the only thing that lets a trade skip review.
          </p>
        </CardHeader>
        <CardContent>
          <form action={upsertBrandAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" placeholder="e.g. razer-gold" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Razer Gold" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="USA · e-code" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requires">Needs</Label>
              <select id="requires" name="requires" defaultValue="both"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                <option value="both">Code and image</option>
                <option value="code">Code only</option>
                <option value="image">Image only</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked className="size-4" /> Buying
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="autoVerify" className="size-4" /> Auto-verify
              </label>
              <Button type="submit">Save brand</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
