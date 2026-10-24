import Link from "next/link";
import { ShieldAlert, TrendingUp, KeyRound, Globe, Network, MapPin, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/Pagination";
import { requirePermission } from "@/lib/auth";
import { accounts } from "@/lib/sdk/accounts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function riskChip(risk: number) {
  const cls =
    risk >= 80 ? "bg-destructive/15 text-destructive"
    : risk >= 60 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
    : risk >= 40 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>risk {risk}</span>;
}

export default async function FraudPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("customers.read");
  const { page: pageParam } = await searchParams;
  const [o, all] = await Promise.all([accounts.fraudOverview(), accounts.fraudAlerts(200)]);
  const page = Math.max(1, Number(pageParam) || 1);
  const alerts = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tiles = [
    { label: "Flagged alerts", value: o.flagged, icon: ShieldAlert, tone: "text-destructive" },
    { label: "High-risk (30d)", value: o.highRisk, icon: TrendingUp, tone: "text-orange-600 dark:text-orange-400" },
    { label: "Failed sign-ins (24h)", value: o.failed24h, icon: KeyRound, tone: "" },
    { label: "Countries seen", value: o.countries, icon: Globe, tone: "" },
    { label: "Distinct IPs (30d)", value: o.distinctIps, icon: Network, tone: "" },
  ];
  const maxCountry = Math.max(1, ...o.topCountries.map((c) => c.count));

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Every sign-in is scored against the account’s own history — unfamiliar IPs, devices and countries, impossible travel and brute-force bursts. Alerts here are advisory and never lock a user out on their own.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{t.label}</CardTitle>
              <t.icon className={`size-4 ${t.tone || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold tracking-tight ${t.tone}`}>{t.value.toLocaleString()}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Alerts */}
        <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4" /> Alert queue</CardTitle></CardHeader>
          <CardContent className="px-0">
            {alerts.length === 0 ? (
              <p className="text-muted-foreground px-6 py-10 text-center text-sm">No risky sign-ins. All clear.</p>
            ) : (
              <div className="divide-y">
                {alerts.map((a) => (
                  <div key={a.id} className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {riskChip(a.risk)}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {a.user
                            ? <Link href={`/users/${a.user.id}`} className="hover:underline">{a.user.name}</Link>
                            : "Unknown"}
                          <span className="text-muted-foreground font-normal"> · {a.label}</span>
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                          <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {a.location}{a.ip ? ` · ${a.ip}` : ""}</span>
                          {a.device && <span className="inline-flex items-center gap-1"><Monitor className="size-3" /> {a.device}</span>}
                        </div>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">{when(a.at)}</span>
                    </div>
                    {a.signals.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 pl-[3.75rem]">
                        {a.signals.map((s) => (
                          <Badge key={s.code} variant="outline" className="gap-1 text-[10px]">
                            {s.label}<span className="text-muted-foreground">+{s.weight}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Pagination page={page} pageSize={PAGE_SIZE} total={all.length} basePath="/services/accounts/fraud" />
        </div>

        {/* Sidebars: top IPs + countries */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Network className="size-4" /> Top IP addresses</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {o.topIps.length === 0 ? <p className="text-muted-foreground text-sm">No data.</p> : o.topIps.map((ip) => (
                <div key={ip.ip} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs">{ip.ip}</span>
                  <span className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span>{ip.count} events</span>
                    {ip.users > 1 && <Badge variant="warning" className="text-[10px]">{ip.users} users</Badge>}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Globe className="size-4" /> Top locations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {o.topCountries.length === 0 ? <p className="text-muted-foreground text-sm">No data.</p> : o.topCountries.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground tabular-nums">{c.count}</span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
