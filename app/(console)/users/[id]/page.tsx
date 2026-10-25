import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Wallet, Landmark, Boxes, CreditCard, ArrowLeftRight, Building2, CalendarDays, Mail, Hash,
  ShieldCheck, ShieldAlert, GraduationCap, Gamepad2, Gift, type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Notice from "@/components/page/Notice";
import EmptyState from "@/components/page/EmptyState";
import { can, requirePermission } from "@/lib/auth";
import { listCustomerNotes } from "@/lib/customer-notes";
import { getUserDetail, type UserDetail, type CustomerActivity } from "@/lib/data";
import { AccountsError, accounts, type Role } from "@/lib/sdk/accounts";
import UserActions from "./UserActions";
import CustomerNotes, { type CustomerNoteView } from "./CustomerNotes";
import CustomerSuspensionControl from "./CustomerSuspensionControl";
import RoleAssigner from "../../services/accounts/users/[id]/RoleAssigner";

const DECIMALS: Record<string, number> = { NGN: 2, USD: 2, USDT: 6, BTC: 8 };
const SYM: Record<string, string> = { NGN: "₦", USD: "$", USDT: "₮", BTC: "₿" };
function fmt(minor: string, asset: string) {
  const d = DECIMALS[asset] ?? 2;
  const neg = minor.startsWith("-");
  const abs = minor.replace("-", "").padStart(d + 1, "0");
  const whole = abs.slice(0, abs.length - d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + (SYM[asset] ?? "") + whole + (d ? "." + abs.slice(-d) : "");
}
const naira = (kobo: number | string, cur = "NGN") => {
  const value = typeof kobo === "number" ? BigInt(Math.trunc(kobo)) : BigInt(kobo);
  const digits = (value < 0 ? -value : value).toString().padStart(3, "0");
  return `${value < 0 ? "-" : ""}${cur === "NGN" ? "₦" : `${cur} `}${digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${digits.slice(-2)}`;
};
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const sv: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", pending: "warning", failed: "destructive", refunded: "secondary", partially_refunded: "secondary",
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers.read");
  const { id } = await params;
  const numericId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : null;
  const [canAssignRoles, canSuspend] = await Promise.all([
    can("customers.roles.assign"),
    can("customers.suspend"),
  ]);
  const accountUser = numericId
    ? accounts.user(numericId).catch((error: unknown) => {
        if (error instanceof AccountsError && error.status === 404) return null;
        throw error;
      })
    : Promise.resolve(null);
  const roles = canAssignRoles ? accounts.roles() : Promise.resolve([] as Role[]);
  const [platformResult, accountResult, rolesResult, notesResult] = await Promise.allSettled([
    getUserDetail(id),
    accountUser,
    roles,
    listCustomerNotes(id),
  ]);

  if (platformResult.status === "rejected") console.error("Customer 360 could not load platform data", platformResult.reason);
  if (accountResult.status === "rejected") console.error("Customer 360 could not load Accounts data", accountResult.reason);
  if (rolesResult.status === "rejected") console.error("Customer 360 could not load Accounts roles", rolesResult.reason);
  if (notesResult.status === "rejected") console.error("Customer 360 could not load staff notes", notesResult.reason);

  const platformUser = platformResult.status === "fulfilled" ? platformResult.value : null;
  const account = accountResult.status === "fulfilled" ? accountResult.value : null;
  const roleList = rolesResult.status === "fulfilled" ? rolesResult.value : [];
  const notes: CustomerNoteView[] = notesResult.status === "fulfilled" ? notesResult.value : [];
  if (platformResult.status === "fulfilled" && !platformUser && accountResult.status === "fulfilled" && !account) notFound();

  const u: UserDetail = platformUser ?? {
    id, name: account?.name ?? null, email: account?.email ?? null, createdAt: account?.created_at ?? null,
    wallets: [], virtualAccount: null, merchant: null, projects: [], transactions: [], payments: [],
    earnActivity: [], giftcardActivity: [], arenaActivity: [], serviceErrors: [],
  };
  const name = u.name ?? account?.name ?? null;
  const email = u.email ?? account?.email ?? null;
  const dataErrors = [
    ...(platformResult.status === "rejected" ? ["Platform"] : []),
    ...(accountResult.status === "rejected" ? ["Accounts"] : []),
    ...(rolesResult.status === "rejected" ? ["Accounts roles"] : []),
    ...(notesResult.status === "rejected" ? ["staff notes"] : []),
    ...u.serviceErrors,
  ];
  const platformUnavailable = platformResult.status === "rejected";

  const initials = (name ?? email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/users" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> Back to users
      </Link>

      {/* Identity header */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{name ?? "Unnamed user"}</h1>
              {u.wallets.length > 0 && <Badge variant="success">Wallet</Badge>}
              {u.merchant && <Badge variant="default">Merchant</Badge>}
              {u.projects.length > 0 && <Badge variant="secondary">{u.projects.length} projects</Badge>}
              {account?.suspended_at && <Badge variant="destructive">Accounts suspended</Badge>}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" /> {email ?? "—"}</span>
              <span className="inline-flex items-center gap-1.5"><Hash className="size-3.5" /> <span className="font-mono text-xs">{u.id}</span></span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Joined {date(u.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {account && numericId !== null && (
              <CustomerSuspensionControl userId={numericId} suspendedAt={account.suspended_at ?? null} canSuspend={canSuspend} />
            )}
            <UserActions id={u.id} email={email} />
          </div>
        </CardContent>
      </Card>

      {dataErrors.length > 0 && (
        <Notice tone="warning" title="Some customer data is unavailable.">
          Couldn&apos;t reach {Array.from(new Set(dataErrors)).join(", ")}. Check the service connection and, for staff notes, that the customer-notes migration has been applied.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {account && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {account.suspended_at ? <ShieldAlert className="size-4 text-destructive" /> : <ShieldCheck className="size-4" />}
                  Accounts profile
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <ProfileValue label="Email verification" value={account.email_verified ? "Verified" : "Not verified"} />
                <ProfileValue label="Trust score" value={`${account.trust.score} · ${account.trust.band}`} />
                <ProfileValue label="Connected apps" value={String(account.connected_apps)} />
                <ProfileValue label="Roles" value={account.roles.map((role) => role.label).join(", ") || "No roles"} />
                {account.suspended_at && (
                  <div className="sm:col-span-2">
                    <ProfileValue label="Suspension reason" value={account.suspension_reason || "No reason provided"} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {account && canAssignRoles && numericId !== null && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Platform roles</CardTitle></CardHeader>
              <CardContent>
                {rolesResult.status === "fulfilled"
                  ? <RoleAssigner canAssign userId={numericId} allRoles={roleList} assigned={account.roles.map((role) => role.name)} />
                  : <p className="text-destructive text-sm">Couldn&apos;t load Accounts roles. Check the Accounts service connection.</p>}
              </CardContent>
            </Card>
          )}
        </div>
        {notesResult.status === "fulfilled"
          ? <CustomerNotes userId={id} notes={notes} />
          : <Notice tone="warning" title="Staff notes could not be loaded.">Check the admin database connection and customer-notes migration.</Notice>}
      </div>

      {accountResult.status === "fulfilled" && !account && (
        <Notice tone="info" title="No Accounts profile found.">
          The shared ID does not resolve to an Accounts user, so identity, trust, roles, and suspension controls are unavailable.
        </Notice>
      )}

      {account && account.security_events.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent security events</CardTitle></CardHeader>
          <CardContent className="divide-y px-0">
            {account.security_events.map((event, index) => (
              <div key={`${event.type}-${event.at}-${index}`} className="flex flex-wrap justify-between gap-2 px-6 py-3 text-sm">
                <div>
                  <p className="font-medium">{event.label}</p>
                  <p className="text-muted-foreground text-xs">{event.device ?? "Unknown device"} · {event.ip ?? "No IP recorded"}</p>
                </div>
                <span className="text-muted-foreground text-xs">{event.at ? date(event.at) : "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <ActivityCard icon={GraduationCap} title="Earn activity" rows={u.earnActivity} unavailable={platformUnavailable || u.serviceErrors.includes("Earn")} />
        <ActivityCard icon={Gift} title="Gift card trades" rows={u.giftcardActivity} unavailable={platformUnavailable || u.serviceErrors.includes("Gift Cards")} />
        <ActivityCard icon={Gamepad2} title="Arena activity" rows={u.arenaActivity} unavailable={platformUnavailable || u.serviceErrors.includes("Arena")} />
      </div>

      {/* Two-column body */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: balances, virtual account, merchant, projects */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Wallet className="size-4" /> Wallet balances</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {u.wallets.length === 0 ? (
                <p className="text-muted-foreground text-sm">No wallet.</p>
              ) : u.wallets.map((w) => (
                <div key={w.asset} className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{w.asset}</span>
                  <span className="font-semibold tabular-nums">{fmt(w.balance, w.asset)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4" /> Virtual account</CardTitle></CardHeader>
            <CardContent>
              {u.virtualAccount ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{u.virtualAccount.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Number</span><span className="font-mono font-medium">{u.virtualAccount.accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{u.virtualAccount.accountName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="font-medium">{u.virtualAccount.currency}</span></div>
                </div>
              ) : <p className="text-muted-foreground text-sm">Not provisioned.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Landmark className="size-4" /> Merchant</CardTitle></CardHeader>
            <CardContent>
              {u.merchant ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Business</span><span className="truncate font-medium">{u.merchant.businessName}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Email</span><span className="truncate font-medium">{u.merchant.email ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Since</span><span className="font-medium">{date(u.merchant.createdAt)}</span></div>
                </div>
              ) : <p className="text-muted-foreground text-sm">Not a merchant.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Boxes className="size-4" /> Projects</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {u.projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No projects.</p>
              ) : u.projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">{p.slug}</div>
                  </div>
                  <Badge variant="outline">{p.region}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: activity */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><ArrowLeftRight className="size-4" /> Recent wallet activity</CardTitle>
              <Link href="/transactions" className="text-primary text-sm hover:underline">All</Link>
            </CardHeader>
            <CardContent className="px-0">
              {u.transactions.length === 0 ? (
                <p className="text-muted-foreground px-6 py-6 text-center text-sm">No transactions.</p>
              ) : (
                <div className="divide-y">
                  {u.transactions.map((t) => {
                    const credit = t.direction === "credit";
                    return (
                      <div key={t.reference} className="flex items-center gap-3 px-6 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium capitalize">{t.source.replace(/_/g, " ")}</div>
                          <div className="text-muted-foreground truncate font-mono text-xs">{t.reference}</div>
                        </div>
                        <span className="text-muted-foreground text-xs">{date(t.createdAt)}</span>
                        <div className={"w-28 text-right text-sm font-semibold tabular-nums " + (credit ? "text-emerald-600 dark:text-emerald-400" : "")}>
                          {credit ? "+" : "-"}{fmt(t.amount, t.asset)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4" /> Payments made</CardTitle>
              <Link href="/payments" className="text-primary text-sm hover:underline">All</Link>
            </CardHeader>
            <CardContent className="px-0">
              {u.payments.length === 0 ? (
                <p className="text-muted-foreground px-6 py-6 text-center text-sm">No payments.</p>
              ) : (
                <div className="divide-y">
                  {u.payments.map((p) => (
                    <div key={p.reference} className="flex items-center gap-3 px-6 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.business ?? "Payment"}</div>
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
      <Separator className="opacity-0" />
    </div>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function ActivityCard({
  icon: Icon,
  title,
  rows,
  unavailable,
}: {
  icon: LucideIcon;
  title: string;
  rows: CustomerActivity[];
  unavailable: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {unavailable ? (
          <p className="text-muted-foreground px-6 py-5 text-sm">Couldn&apos;t reach this service. Check its database connection.</p>
        ) : rows.length === 0 ? (
          <EmptyState compact icon={Icon} title="No recent activity" />
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.label}</p>
                  <p className="text-muted-foreground truncate text-xs">{row.detail} · {row.status}</p>
                </div>
                <div className="shrink-0 text-right">
                  {row.amountMinor !== null && <p className="text-sm font-medium tabular-nums">{naira(row.amountMinor)}</p>}
                  <p className="text-muted-foreground text-xs">{date(row.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
