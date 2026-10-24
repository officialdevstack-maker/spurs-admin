import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Wallet, Landmark, Boxes, CreditCard, ArrowLeftRight, Building2, CalendarDays, Mail, Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getUserDetail } from "@/lib/data";
import UserActions from "./UserActions";

const DECIMALS: Record<string, number> = { NGN: 2, USD: 2, USDT: 6, BTC: 8 };
const SYM: Record<string, string> = { NGN: "₦", USD: "$", USDT: "₮", BTC: "₿" };
function fmt(minor: string, asset: string) {
  const d = DECIMALS[asset] ?? 2;
  const neg = minor.startsWith("-");
  const abs = minor.replace("-", "").padStart(d + 1, "0");
  const whole = abs.slice(0, abs.length - d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + (SYM[asset] ?? "") + whole + (d ? "." + abs.slice(-d) : "");
}
const naira = (kobo: number, cur = "NGN") => (cur === "NGN" ? "₦" : cur + " ") + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 });
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const sv: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", pending: "warning", failed: "destructive", refunded: "secondary", partially_refunded: "secondary",
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUserDetail(id);
  if (!u) notFound();

  const initials = (u.name ?? u.email ?? "U").slice(0, 2).toUpperCase();

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
              <h1 className="text-xl font-semibold tracking-tight">{u.name ?? "Unnamed user"}</h1>
              {u.wallets.length > 0 && <Badge variant="success">Wallet</Badge>}
              {u.merchant && <Badge variant="default">Merchant</Badge>}
              {u.projects.length > 0 && <Badge variant="secondary">{u.projects.length} projects</Badge>}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" /> {u.email ?? "—"}</span>
              <span className="inline-flex items-center gap-1.5"><Hash className="size-3.5" /> <span className="font-mono text-xs">{u.id}</span></span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Joined {date(u.createdAt)}</span>
            </div>
          </div>
          <UserActions id={u.id} email={u.email} />
        </CardContent>
      </Card>

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
