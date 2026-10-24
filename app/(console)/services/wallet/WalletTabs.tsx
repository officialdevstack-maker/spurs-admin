"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ArrowLeftRight, Share2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/services/wallet", icon: LayoutDashboard, exact: true },
  { label: "Holders", href: "/services/wallet/holders", icon: Users },
  { label: "Transactions", href: "/services/wallet/transactions", icon: ArrowLeftRight },
  { label: "Connections", href: "/services/wallet/connections", icon: Share2 },
  { label: "Settings", href: "/services/wallet/settings", icon: Settings },
];

export default function WalletTabs() {
  const pathname = usePathname();
  const active = (t: (typeof TABS)[number]) => (t.exact ? pathname === t.href : pathname.startsWith(t.href));
  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active(t) ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
            )}>
            <t.icon className="size-4" />{t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
