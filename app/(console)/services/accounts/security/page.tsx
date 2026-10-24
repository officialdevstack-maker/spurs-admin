import Link from "next/link";
import { LogIn, LogOut, UserPlus, KeyRound, ShieldCheck, AppWindow, Activity, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Pagination from "@/components/Pagination";
import { requirePermission } from "@/lib/auth";
import { accounts } from "@/lib/sdk/accounts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const ICONS: Record<string, typeof Activity> = {
  login: LogIn, login_failed: LogOut, registered: UserPlus, password_changed: KeyRound, password_reset: KeyRound,
  email_verified: ShieldCheck, app_connected: AppWindow, app_revoked: AppWindow,
};

const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function riskChip(risk: number) {
  if (risk < 40) return null;
  const cls = risk >= 80 ? "bg-destructive/15 text-destructive"
    : risk >= 60 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
    : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${cls}`}>risk {risk}</span>;
}

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("customers.read");
  const { page: pageParam } = await searchParams;
  const all = await accounts.securityEvents(300);
  const page = Math.max(1, Number(pageParam) || 1);
  const events = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Platform-wide identity activity — sign-ins, password changes and app authorizations across every account.</p>
      <Card className="py-0">
        <CardContent className="px-0">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No security events yet.</p>
          ) : (
            <div className="divide-y">
              {events.map((e) => {
                const Icon = ICONS[e.type] ?? Activity;
                return (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {e.label}
                        {riskChip(e.risk)}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 truncate text-xs">
                        {e.user ? (
                          <Link href={`/users/${e.user.id}`} className="hover:underline">{e.user.name}</Link>
                        ) : "Unknown"}
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {e.location}</span>
                        {e.device ? <span>· {e.device}</span> : null}{e.ip ? <span>· {e.ip}</span> : null}
                      </div>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{when(e.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} pageSize={PAGE_SIZE} total={all.length} basePath="/services/accounts/security" />
    </div>
  );
}
