"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShieldCheck, Activity, ShieldAlert, Settings, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/services/accounts", icon: LayoutDashboard, exact: true },
  { label: "Users", href: "/services/accounts/users", icon: Users },
  { label: "KYC", href: "/services/accounts/kyc", icon: BadgeCheck },
  { label: "Roles & permissions", href: "/services/accounts/roles", icon: ShieldCheck },
  { label: "Fraud & risk", href: "/services/accounts/fraud", icon: ShieldAlert },
  { label: "Security", href: "/services/accounts/security", icon: Activity },
  { label: "Settings", href: "/services/accounts/settings", icon: Settings },
];

export default function AccountsTabs() {
  const pathname = usePathname();
  const active = (t: (typeof TABS)[number]) =>
    t.exact ? pathname === t.href : pathname.startsWith(t.href);

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active(t)
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
