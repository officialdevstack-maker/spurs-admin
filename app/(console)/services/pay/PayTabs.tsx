"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Store, ArrowUpRight, SlidersHorizontal, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/services/pay", icon: LayoutDashboard, exact: true },
  { label: "Payments", href: "/services/pay/payments", icon: CreditCard },
  { label: "Merchants", href: "/services/pay/merchants", icon: Store },
  { label: "Payouts", href: "/services/pay/payouts", icon: ArrowUpRight },
  { label: "Providers", href: "/services/pay/providers", icon: SlidersHorizontal },
  { label: "Settings", href: "/services/pay/settings", icon: Settings },
];

export default function PayTabs() {
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
