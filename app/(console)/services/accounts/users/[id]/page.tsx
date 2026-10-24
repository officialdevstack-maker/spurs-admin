import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Hash, CalendarDays, BadgeCheck, AppWindow, ShieldCheck, KeyRound, Activity, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { accounts, AccountsError } from "@/lib/sdk/accounts";
import RoleAssigner from "./RoleAssigner";

export const dynamic = "force-dynamic";

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

const trustText = (s: number) =>
  s >= 80 ? "text-emerald-600 dark:text-emerald-400"
  : s >= 65 ? "text-green-600 dark:text-green-400"
  : s >= 45 ? "text-amber-600 dark:text-amber-400"
  : s >= 25 ? "text-orange-600 dark:text-orange-400" : "text-destructive";
const trustBar = (s: number) =>
  s >= 80 ? "bg-emerald-500" : s >= 65 ? "bg-green-500" : s >= 45 ? "bg-amber-500" : s >= 25 ? "bg-orange-500" : "bg-destructive";

export default async function AccountUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let user, allRoles;
  try {
    [user, allRoles] = await Promise.all([accounts.user(id), accounts.roles()]);
  } catch (e) {
    if (e instanceof AccountsError && e.status === 404) notFound();
    throw e;
  }

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const permsByService = user.permissions
    .filter((p) => !p.endsWith(".*"))
    .reduce<Record<string, string[]>>((acc, p) => {
      const svc = p.split(".")[0];
      (acc[svc] ??= []).push(p);
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      <Link href="/services/accounts/users" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> Back to accounts
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{user.name}</h2>
              {user.email_verified ? <Badge variant="success"><BadgeCheck className="size-3" /> Verified</Badge> : <Badge variant="warning">Unverified</Badge>}
              {user.roles.map((r) => (
                <Badge key={r.name} variant={r.name === "superadmin" ? "default" : "secondary"}>{r.label}</Badge>
              ))}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" /> {user.email}</span>
              <span className="inline-flex items-center gap-1.5"><Hash className="size-3.5" /> {user.id}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Joined {date(user.created_at)}</span>
              <span className="inline-flex items-center gap-1.5"><AppWindow className="size-3.5" /> {user.connected_apps} connected app{user.connected_apps === 1 ? "" : "s"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Gauge className="size-4" /> Trust score</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2">
                <span className={"text-4xl font-bold tabular-nums " + trustText(user.trust.score)}>{user.trust.score}</span>
                <span className="text-muted-foreground mb-1 text-sm capitalize">/ 100 · {user.trust.band}</span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div className={"h-full rounded-full " + trustBar(user.trust.score)} style={{ width: `${user.trust.score}%` }} />
              </div>
              <div className="space-y-1 pt-1">
                {user.trust.factors.map((f) => (
                  <div key={f.code} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className={"font-medium tabular-nums " + (f.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                      {f.delta > 0 ? "+" : ""}{f.delta}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground border-t pt-2 text-xs">A reputation signal for future credit &amp; loan eligibility.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Roles</CardTitle></CardHeader>
            <CardContent>
              <RoleAssigner userId={user.id} allRoles={allRoles} assigned={user.roles.map((r) => r.name)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" /> Effective permissions</CardTitle></CardHeader>
            <CardContent>
              {user.roles.some((r) => r.name === "superadmin") ? (
                <p className="text-sm"><Badge variant="default">Superadmin</Badge> <span className="text-muted-foreground">— unrestricted access to every service.</span></p>
              ) : Object.keys(permsByService).length === 0 ? (
                <p className="text-muted-foreground text-sm">No permissions. This account has no admin access.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(permsByService).map(([svc, keys]) => (
                    <div key={svc}>
                      <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">{svc}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {keys.map((k) => <Badge key={k} variant="outline" className="font-mono text-xs">{k}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4" /> Recent security activity</CardTitle></CardHeader>
            <CardContent className="px-0">
              {user.security_events.length === 0 ? (
                <p className="text-muted-foreground px-6 py-6 text-center text-sm">No activity.</p>
              ) : (
                <div className="divide-y">
                  {user.security_events.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{e.label}</div>
                        <div className="text-muted-foreground truncate text-xs">{e.device ?? "—"}{e.ip ? ` · ${e.ip}` : ""}</div>
                      </div>
                      <span className="text-muted-foreground text-xs">{date(e.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
