"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight, Boxes, KeyRound, ScrollText,
  Settings2, Wallet, Globe, ClipboardList, Fingerprint, Gift, Mail, UsersRound, ShieldCheck, HandCoins, Sparkles, Timer,
  LineChart, BadgeCheck, ChevronRight, Gamepad2, Briefcase, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Leaf = { label: string; href: string; icon: LucideIcon };
type Group = { label: string; icon: LucideIcon; children: Leaf[] };
type Item = Leaf | Group;

const NAV: Item[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  {
    label: "Platform",
    icon: Boxes,
    children: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Services",
    icon: Wallet,
    children: [
      { label: "Accounts", href: "/services/accounts", icon: Fingerprint },
      { label: "Pay", href: "/services/pay", icon: CreditCard },
      { label: "Wallet", href: "/services/wallet", icon: Wallet },
      { label: "Cloud", href: "/services/cloud", icon: Globe },
      { label: "Survey", href: "/services/survey", icon: ClipboardList },
      { label: "Gift cards", href: "/services/giftcards", icon: Gift },
      { label: "AI Trader", href: "/services/aitrader", icon: LineChart },
      { label: "Arena", href: "/services/arena", icon: Gamepad2 },
      { label: "Suite", href: "/services/suite", icon: Briefcase },
    ],
  },
  {
    label: "Configuration",
    icon: Settings2,
    children: [
      { label: "Apps", href: "/apps", icon: Boxes },
      { label: "Credentials", href: "/credentials", icon: KeyRound },
      { label: "Mail", href: "/mail", icon: Mail },
      { label: "AI", href: "/ai", icon: Sparkles },
      { label: "Subscriptions", href: "/subscriptions", icon: BadgeCheck },
      { label: "Scheduler", href: "/scheduler", icon: Timer },
    ],
  },
  {
    label: "Team",
    icon: UsersRound,
    children: [
      { label: "People", href: "/team", icon: UsersRound },
      { label: "Teams", href: "/team/teams", icon: Boxes },
      { label: "Roles", href: "/team/roles", icon: ShieldCheck },
      { label: "Payroll", href: "/payroll", icon: Wallet },
      { label: "Advances", href: "/payroll/advances", icon: HandCoins },
    ],
  },
  {
    label: "System",
    icon: ScrollText,
    children: [{ label: "Audit log", href: "/audit", icon: ScrollText }],
  },
];

const isGroup = (i: Item): i is Group => "children" in i;

export default function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV.filter(isGroup).map((g) => [g.label, g.children.some((c) => isActive(c.href))]),
    ),
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {NAV.map((item) => {
        if (!isGroup(item)) {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        }

        const GroupIcon = item.icon;
        const expanded = open[item.label];
        const hasActiveChild = item.children.some((c) => isActive(c.href));

        return (
          <div key={item.label}>
            <button
              onClick={() => setOpen((o) => ({ ...o, [item.label]: !o[item.label] }))}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                hasActiveChild ? "text-sidebar-accent-foreground font-medium" : "text-muted-foreground",
                "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <GroupIcon className="size-4" />
              {item.label}
              <ChevronRight className={cn("ml-auto size-4 transition-transform", expanded && "rotate-90")} />
            </button>

            {expanded && (
              <div className="border-sidebar-border mt-0.5 ml-4 space-y-0.5 border-l pl-3">
                {item.children.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                        isActive(c.href)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
