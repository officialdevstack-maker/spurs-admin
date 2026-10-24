"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Gamepad2, Swords, Bell, Settings, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/services/arena", icon: LayoutDashboard, exact: true },
  { label: "Games", href: "/services/arena/games", icon: Gamepad2 },
  { label: "Matches", href: "/services/arena/matches", icon: Swords },
  { label: "Levels", href: "/services/arena/levels", icon: Trophy },
  { label: "Notifications", href: "/services/arena/notifications", icon: Bell },
  { label: "Settings", href: "/services/arena/settings", icon: Settings },
];

export default function ArenaTabs() {
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
