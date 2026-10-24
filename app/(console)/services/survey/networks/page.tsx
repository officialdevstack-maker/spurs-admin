import { Globe, KeyRound, Link2, TrendingUp, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveConfig } from "@/lib/credentials";
import { can } from "@/lib/auth";
import { redirect } from "next/navigation";
import { survey } from "@/lib/sdk/survey";
import { saveNetworkAction, saveEconomicsAction } from "./actions";

export const dynamic = "force-dynamic";

const usd = (v: number) => "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * The networks that supply external surveys. Users never see these names — the
 * Earn app presents every one of them as a Spurs survey collection — so this
 * page is the only place the real vendors appear.
 */
const NETWORKS = [
  { id: "bitlabs", name: "BitLabs", docs: "https://developer.bitlabs.ai",
    hint: "Set the postback URL below in the BitLabs dashboard and copy the API secret here." },
  { id: "cpx", name: "CPX Research", docs: "https://docs.cpx-research.com",
    hint: "Use the app id and secure hash from your CPX app settings." },
  { id: "pollfish", name: "Pollfish", docs: "https://www.pollfish.com/docs",
    hint: "The signing secret is separate from the API key in the Pollfish publisher dashboard." },
  { id: "theoremreach", name: "TheoremReach", docs: "https://www.theoremreach.com/docs",
    hint: "Use your API key and API secret from the TheoremReach app settings." },
  { id: "adgate", name: "AdGate Media", docs: "https://developers.adgatemedia.com",
    hint: "Use your wall code as the app id, and the postback key from the dashboard as the secret." },
  { id: "tapresearch", name: "Tap Research", docs: "https://docs.tapresearch.com",
    hint: "Use your API token and the signing secret from the Tap Research dashboard." },
];

const APP_URL = process.env.SURVEY_PUBLIC_URL ?? "http://127.0.0.1:3400";

export default async function Networks() {
  const [canManageCredentials, canManageSettings] = await Promise.all([
    can("platform.credentials.manage"),
    can("platform.settings.manage"),
  ]);
  if (!canManageCredentials && !canManageSettings) redirect("/?error=forbidden");
  const [config, revenue] = await Promise.all([resolveConfig("survey"), survey.revenue(30)]);

  const revenueShare = config.SURVEY_REVENUE_SHARE ?? "0.6";
  const usdNgn = config.SURVEY_USD_NGN ?? "1600";
  const xpPer100 = config.SURVEY_XP_PER_100_NGN ?? "25";
  const holdHours = config.SURVEY_HOLD_HOURS ?? "24";

  const byProvider = new Map(revenue.map((r) => [r.provider, r]));

  return (
    <div className="space-y-6">
      {canManageSettings && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" /> Economics
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            How network revenue is split with users, and what points are worth. Changes take effect within a
            minute — the Earn app reads this config, it has no copy of its own.
          </p>
        </CardHeader>
        <CardContent>
          <form action={saveEconomicsAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="revenueShare">User revenue share</Label>
              <Input id="revenueShare" name="revenueShare" defaultValue={revenueShare} inputMode="decimal" />
              <p className="text-muted-foreground text-xs">
                0–1. At {revenueShare}, we keep {Math.round((1 - Number(revenueShare)) * 100)}%.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usdNgn">USD → NGN rate</Label>
              <Input id="usdNgn" name="usdNgn" defaultValue={usdNgn} inputMode="decimal" />
              <p className="text-muted-foreground text-xs">Used to price a payout in points.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xpPer100">XP per ₦100 earned</Label>
              <Input id="xpPer100" name="xpPer100" defaultValue={xpPer100} inputMode="numeric" />
              <p className="text-muted-foreground text-xs">Controls how fast network surveys level people up.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holdHours">Default payout hold (hours)</Label>
              <Input id="holdHours" name="holdHours" defaultValue={holdHours} inputMode="numeric" />
              <p className="text-muted-foreground text-xs">Level 4 and 5 wait less — that's a level perk.</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">Save economics</Button>
            </div>
          </form>
        </CardContent>
      </Card>}

      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <EyeOff className="mt-0.5 size-4 shrink-0" />
        <p>
          These vendor names never reach the product. In the Earn app each connected network is presented as a
          Spurs survey collection, served through our own URL — so a network can be swapped without users noticing.
        </p>
      </div>

      {NETWORKS.map((net) => {
        const appId = config[`SURVEY_${net.id.toUpperCase()}_APP_ID`] ?? "";
        const hasSecret = Boolean(config[`SURVEY_${net.id.toUpperCase()}_SECRET`]);
        const enabled = (config[`SURVEY_${net.id.toUpperCase()}_ENABLED`] ?? "true") !== "false" && Boolean(appId);
        const rev = byProvider.get(net.id);

        return (
          <Card key={net.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="size-4" /> {net.name}
                  <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Live" : "Off"}</Badge>
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">{net.hint}</p>
              </div>
              {rev && (
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{usd(rev.marginUsd)}</div>
                  <p className="text-muted-foreground text-xs">margin, 30 days</p>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-sm">
                <Link2 className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Postback URL — paste this into their dashboard</p>
                  <code className="block truncate text-xs">{APP_URL}/api/providers/{net.id}/postback</code>
                </div>
              </div>

              {canManageCredentials ? <form action={saveNetworkAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={net.id} />

                <div className="space-y-1.5">
                  <Label htmlFor={`${net.id}-appId`}>App / publisher id</Label>
                  <Input id={`${net.id}-appId`} name="appId" defaultValue={appId} placeholder="e.g. 12345" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${net.id}-secret`} className="flex items-center gap-1.5">
                    <KeyRound className="size-3.5" /> Signing secret
                  </Label>
                  <Input id={`${net.id}-secret`} name="secret" type="password"
                    placeholder={hasSecret ? "•••••••• (leave blank to keep)" : "Paste the secret"} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
                  Enabled
                </label>

                <div className="flex items-center justify-end gap-3 sm:col-span-2">
                  <a href={net.docs} target="_blank" rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground text-sm underline">
                    Docs
                  </a>
                  <Button type="submit">Save</Button>
                </div>
              </form> : <p className="text-muted-foreground text-sm">Credential management permission is required to edit this network.</p>}

              {rev && (
                <div className="text-muted-foreground grid gap-2 border-t pt-3 text-sm sm:grid-cols-4">
                  <span>{rev.completions.toLocaleString()} completions</span>
                  <span>{usd(rev.grossUsd)} gross</span>
                  <span>{usd(rev.userUsd)} to users</span>
                  <span>{rev.points.toLocaleString()} points issued</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}