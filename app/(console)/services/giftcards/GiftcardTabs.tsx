"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Percent, Receipt, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/services/giftcards", icon: LayoutDashboard, exact: true },
  { label: "Review queue", href: "/services/giftcards/review", icon: ShieldCheck },
  { label: "Rates", href: "/services/giftcards/rates", icon: Percent },
  { label: "Orders", href: "/services/giftcards/orders", icon: Receipt },
  { label: "Breakage", href: "/services/giftcards/breakage", icon: PieChart },
];

export default function GiftcardTabs() {
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
