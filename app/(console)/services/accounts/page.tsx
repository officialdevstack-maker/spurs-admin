import Link from "next/link";
import { Users, BadgeCheck, ShieldCheck, KeyRound, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LineChart, { type Point } from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import { accounts } from "@/lib/sdk/accounts";

export const dynamic = "force-dynamic";

// Trust bands are ordinal — a diverging green→gray→red ramp (two hues + neutral
// midpoint). Every slice is labelled, so colour is never the sole cue.
const BAND_COLOR: Record<string, string> = {
  excellent: "#15803d", good: "#4ade80", fair: "#9ca3af", poor: "#f87171", "at risk": "#b91c1c",
};

export default async function AccountsOverview() {
  const [o, a] = await Promise.all([accounts.overview(), accounts.analytics(14)]);

  const tiles = [
    { label: "Accounts", value: o.users, icon: Users },
    { label: "Verified", value: o.verified, icon: BadgeCheck },
    { label: "Avg trust", value: o.avgTrust, icon: Gauge },
    { label: "Roles", value: o.roles, icon: ShieldCheck },
    { label: "Security events", value: o.events, icon: KeyRound },
  ];

  const loginPoints: Point[] = a.loginsSeries.map((d) => {
    const dt = new Date(d.date);
    return {
      label: dt.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      full: dt.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }),
      value: d.count,
    };
  });
  const roleBars = o.roleDistribution.map((r) => ({ label: r.label, value: r.users }));
  const trustSlices = a.trustBands.map((b) => ({ label: b.band, value: b.count, color: BAND_COLOR[b.band] ?? "#9ca3af" }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{t.label}</CardTitle>
              <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg"><t.icon className="size-4" /></span>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold tracking-tight">{t.value.toLocaleString()}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Line + donut */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sign-ins</CardTitle>
            <p className="text-muted-foreground text-sm">Successful sign-ins · last 14 days</p>
          </CardHeader>
          <CardContent><LineChart data={loginPoints} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trust bands</CardTitle>
            <p className="text-muted-foreground text-sm">Accounts by trust score</p>
          </CardHeader>
          <CardContent><DonutChart data={trustSlices} centerLabel="accounts" /></CardContent>
        </Card>
      </div>

      {/* Bar + newest */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Accounts per role</CardTitle>
            <Link href="/services/accounts/roles" className="text-primary text-sm font-medium hover:underline">Manage</Link>
          </CardHeader>
          <CardContent><BarChart data={roleBars} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Newest accounts</CardTitle>
            <Link href="/services/accounts/users" className="text-primary text-sm font-medium hover:underline">All users</Link>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              {o.recentUsers.map((u) => (
                <Link key={u.id} href={`/services/accounts/users/${u.id}`} className="hover:bg-muted/50 flex items-center gap-3 px-6 py-2.5 transition-colors">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{(u.name ?? u.email).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u.name}</div>
                    <div className="text-muted-foreground truncate text-xs">{u.email}</div>
                  </div>
                  {u.roles.slice(0, 2).map((r) => (
                    <Badge key={r.name} variant={r.name === "superadmin" ? "default" : "secondary"} className="hidden sm:inline-flex">{r.label}</Badge>
                  ))}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
