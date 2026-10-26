import Link from "next/link";
import { Fingerprint, CreditCard, Landmark, Send, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ServiceFlow, { type FlowEdge } from "@/components/ServiceFlow";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import { walletStats, connections } from "@/lib/wallet-data";

export const dynamic = "force-dynamic";

const naira = (k: number) => "₦" + Math.round(k / 100).toLocaleString("en-NG");

export default async function WalletConnectionsPage() {
  await requirePermission("money.read");
  const [stats, conn] = await Promise.all([walletStats(), connections()]);

  const edges: FlowEdge[] = [
    { from: "accounts", to: "wallet", label: "owns", metric: `${conn.holders}`, sub: "holders" },
    { from: "pay", to: "wallet", label: "top-ups", metric: `${conn.fundedViaPay.count}`, sub: naira(conn.fundedViaPay.volume) },
    { from: "bank", to: "wallet", label: "deposits", metric: `${conn.bankDeposits.count}`, sub: naira(conn.bankDeposits.volume) },
    { from: "wallet", to: "out", label: "spend", metric: `${conn.spend.count}`, sub: naira(conn.spend.volume) },
  ];

  const links = [
    {
      icon: Fingerprint, tone: "text-violet-600 dark:text-violet-400",
      title: "Accounts → Wallet", body: `${conn.holders} Spurs accounts hold a wallet. Identity, roles and trust come from Accounts; each wallet is keyed to that account.`,
      href: "/services/accounts", cta: "Open Accounts",
    },
    {
      icon: CreditCard, tone: "text-sky-600 dark:text-sky-400",
      title: "Pay → Wallet", body: `${conn.fundedViaPay.count} top-ups (${naira(conn.fundedViaPay.volume)}) funded through Spurs Pay. A wallet top-up is a Pay charge that credits the ledger on success.`,
      href: "/services/pay", cta: "Open Pay",
    },
    {
      icon: Landmark, tone: "text-amber-600 dark:text-amber-400",
      title: "Bank → Wallet", body: `${conn.bankDeposits.count} deposits (${naira(conn.bankDeposits.volume)}) via ${stats.virtualAccounts} dedicated virtual accounts. Bank transfers land in a NUBAN and credit the wallet.`,
      href: "/services/wallet/holders", cta: "View holders",
    },
    {
      icon: Send, tone: "text-rose-600 dark:text-rose-400",
      title: "Wallet → out", body: `${conn.spend.count} debits (${naira(conn.spend.volume)}) — paying merchants, sending to others, or converting between assets.`,
      href: "/services/wallet/transactions", cta: "View transactions",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet connections" description="Follow how funds enter, move through, and leave the Spurs wallet." />
      <p className="text-muted-foreground text-sm">
        Spurs services are one system. Money enters a wallet from <span className="text-foreground font-medium">Pay</span> and <span className="text-foreground font-medium">bank transfers</span>, is held against an <span className="text-foreground font-medium">Accounts</span> identity, and leaves as payments or payouts. Here&apos;s how it connects across the platform.
      </p>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Money flow</CardTitle></CardHeader>
        <CardContent><ServiceFlow edges={edges} /></CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Card key={l.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><l.icon className={`size-4 ${l.tone}`} /> {l.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm">{l.body}</p>
              <Link href={l.href} className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
                {l.cta} <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
