"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Wallet, ShieldAlert, Users, Globe, ListPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/services/survey", icon: LayoutDashboard, exact: true },
  { label: "Tasks", href: "/services/survey/tasks", icon: ListPlus },
  { label: "Cash-outs", href: "/services/survey/cashouts", icon: Wallet },
  { label: "Review", href: "/services/survey/review", icon: ClipboardList },
  { label: "Anti-cheat", href: "/services/survey/risk", icon: ShieldAlert },
  { label: "Earners", href: "/services/survey/earners", icon: Users },
  { label: "Networks", href: "/services/survey/networks", icon: Globe },
];

export default function SurveyTabs() {
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
