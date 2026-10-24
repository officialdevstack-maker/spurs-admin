import Link from "next/link";
import { ArrowRight, Fingerprint, CreditCard, Wallet, Landmark, Send, type LucideIcon } from "lucide-react";

type NodeKey = "accounts" | "pay" | "wallet" | "bank" | "out";

const NODES: Record<NodeKey, { label: string; icon: LucideIcon; cls: string; href?: string }> = {
  accounts: { label: "Accounts", icon: Fingerprint, cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400", href: "/services/accounts" },
  pay: { label: "Pay", icon: CreditCard, cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400", href: "/services/pay" },
  wallet: { label: "Wallet", icon: Wallet, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", href: "/services/wallet" },
  bank: { label: "Bank VA", icon: Landmark, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  out: { label: "Payouts / spend", icon: Send, cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
};

export interface FlowEdge {
  from: NodeKey;
  to: NodeKey;
  label: string;   // what the connection is
  metric: string;  // headline number
  sub?: string;    // secondary (e.g. volume)
}

function Node({ k }: { k: NodeKey }) {
  const nd = NODES[k];
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium">
      <span className={`grid size-6 place-items-center rounded-md ${nd.cls}`}><nd.icon className="size-3.5" /></span>
      {nd.label}
    </span>
  );
  return nd.href ? <Link href={nd.href} className="hover:opacity-80">{inner}</Link> : inner;
}

/** A compact map of how money moves between Spurs services. */
export default function ServiceFlow({ edges }: { edges: FlowEdge[] }) {
  return (
    <div className="space-y-3">
      {edges.map((e, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Node k={e.from} />
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="bg-border h-px w-5" />
            <span className="whitespace-nowrap">{e.label}</span>
            <ArrowRight className="size-3.5" />
          </div>
          <Node k={e.to} />
          <div className="ml-auto text-right">
            <div className="text-sm font-semibold tabular-nums">{e.metric}</div>
            {e.sub && <div className="text-muted-foreground text-xs">{e.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
