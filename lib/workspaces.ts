import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight, Boxes, KeyRound, ScrollText,
  Settings2, Wallet, Globe, ClipboardList, Fingerprint, Gift, Mail, UsersRound,
  ShieldCheck, HandCoins, Sparkles, Timer, LineChart, BadgeCheck, Gamepad2, Briefcase,
  Store, ArrowUpRight, SlidersHorizontal, Settings, ListPlus, ShieldAlert, Activity,
  Percent, Receipt, PieChart, Swords, Bell, Trophy, Share2, Layers,
  type LucideIcon,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export type Held = string[] | "*";
export type WorkspaceGroup = "core" | "service" | "admin";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: string;
}

export interface NavSection { label?: string; items: NavItem[] }

export interface Workspace {
  id: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  group: WorkspaceGroup;
  hue: number;
  chroma?: number;
  home: string;
  match: string[];
  sections: NavSection[];
  external?: { label: string; href: string };
}

export const GROUPS: WorkspaceGroup[] = ["core", "service", "admin"];

export const WORKSPACES: Workspace[] = [
  {
    id: "platform",
    label: "Platform",
    tagline: "Everything across Spurs Cloud",
    icon: LayoutDashboard,
    group: "core",
    hue: 285,
    home: "/",
    match: ["/users", "/payments", "/transactions"],
    sections: [{
      items: [
        { label: "Overview", href: "/", icon: LayoutDashboard },
        { label: "Users", href: "/users", icon: Users },
        { label: "Payments", href: "/payments", icon: CreditCard },
        { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      ],
    }],
  },
  {
    id: "accounts",
    label: "Accounts",
    tagline: "Identity, roles and permissions for all of Spurs Cloud",
    icon: Fingerprint,
    group: "service",
    hue: 310,
    home: "/services/accounts",
    match: ["/services/accounts"],
    external: { label: "Open Accounts app", href: "http://127.0.0.1:8000" },
    sections: [
      { label: "Identity", items: [
        { label: "Overview", href: "/services/accounts", icon: LayoutDashboard },
        { label: "Users", href: "/services/accounts/users", icon: Users },
        { label: "KYC", href: "/services/accounts/kyc", icon: BadgeCheck },
        { label: "Roles & permissions", href: "/services/accounts/roles", icon: ShieldCheck },
      ] },
      { label: "Protection", items: [
        { label: "Fraud & risk", href: "/services/accounts/fraud", icon: ShieldAlert },
        { label: "Security", href: "/services/accounts/security", icon: Activity },
      ] },
      { label: "Configure", items: [
        { label: "Settings", href: "/services/accounts/settings", icon: Settings },
      ] },
    ],
  },
  {
    id: "pay",
    label: "Pay",
    tagline: "Payments, merchants and payouts — the gateway that hides the real provider",
    icon: CreditCard,
    group: "service",
    hue: 255,
    home: "/services/pay",
    match: ["/services/pay"],
    external: { label: "Open Pay app", href: "http://127.0.0.1:3100" },
    sections: [
      { label: "Money", items: [
        { label: "Overview", href: "/services/pay", icon: LayoutDashboard },
        { label: "Payments", href: "/services/pay/payments", icon: CreditCard },
        { label: "Merchants", href: "/services/pay/merchants", icon: Store },
        { label: "Payouts", href: "/services/pay/payouts", icon: ArrowUpRight },
      ] },
      { label: "Configure", items: [
        { label: "Providers", href: "/services/pay/providers", icon: SlidersHorizontal },
        { label: "Settings", href: "/services/pay/settings", icon: Settings },
      ] },
    ],
  },
  {
    id: "wallet",
    label: "Wallet",
    tagline: "Multi-asset balances funded via Pay and bank transfers",
    icon: Wallet,
    group: "service",
    hue: 155,
    home: "/services/wallet",
    match: ["/services/wallet"],
    external: { label: "Open Wallet app", href: "http://127.0.0.1:3200" },
    sections: [
      { label: "Ledger", items: [
        { label: "Overview", href: "/services/wallet", icon: LayoutDashboard },
        { label: "Holders", href: "/services/wallet/holders", icon: Users },
        { label: "Transactions", href: "/services/wallet/transactions", icon: ArrowLeftRight },
        { label: "Connections", href: "/services/wallet/connections", icon: Share2 },
      ] },
      { label: "Configure", items: [
        { label: "Settings", href: "/services/wallet/settings", icon: Settings },
      ] },
    ],
  },
  {
    id: "cloud",
    label: "Cloud",
    tagline: "Domains, hosting and backend projects",
    icon: Globe,
    group: "service",
    hue: 215,
    home: "/services/cloud",
    match: ["/services/cloud"],
    sections: [{ items: [{ label: "Overview", href: "/services/cloud", icon: LayoutDashboard }] }],
  },
  {
    id: "survey",
    label: "Earn",
    tagline: "Tasks, levels, anti-cheat and cash-outs — the task-to-earn side",
    icon: ClipboardList,
    group: "service",
    hue: 65,
    home: "/services/survey",
    match: ["/services/survey"],
    external: { label: "Open Earn app", href: "http://127.0.0.1:3400" },
    sections: [
      { label: "Run", items: [
        { label: "Overview", href: "/services/survey", icon: LayoutDashboard },
        { label: "Tasks", href: "/services/survey/tasks", icon: ListPlus },
        { label: "Cash-outs", href: "/services/survey/cashouts", icon: Wallet },
        { label: "Review", href: "/services/survey/review", icon: ClipboardList },
      ] },
      { label: "Trust & supply", items: [
        { label: "Anti-cheat", href: "/services/survey/risk", icon: ShieldAlert },
        { label: "Earners", href: "/services/survey/earners", icon: Users },
        { label: "Networks", href: "/services/survey/networks", icon: Globe },
      ] },
    ],
  },
  {
    id: "giftcards",
    label: "Gift cards",
    tagline: "Issuing our own cards and buying third-party cards from users",
    icon: Gift,
    group: "service",
    hue: 350,
    home: "/services/giftcards",
    match: ["/services/giftcards"],
    external: { label: "Open Gift Cards app", href: "http://127.0.0.1:3500" },
    sections: [{
      items: [
        { label: "Overview", href: "/services/giftcards", icon: LayoutDashboard },
        { label: "Review queue", href: "/services/giftcards/review", icon: ShieldCheck },
        { label: "Rates", href: "/services/giftcards/rates", icon: Percent },
        { label: "Orders", href: "/services/giftcards/orders", icon: Receipt },
        { label: "Breakage", href: "/services/giftcards/breakage", icon: PieChart },
      ],
    }],
  },
  {
    id: "aitrader",
    label: "AI Trader",
    tagline: "Strategy-ensemble trading engine — reads markets, trains models and manages allocations",
    icon: LineChart,
    group: "service",
    hue: 185,
    home: "/services/aitrader",
    match: ["/services/aitrader"],
    external: { label: "Open Trader console", href: "http://127.0.0.1:3800" },
    sections: [{
      items: [
        { label: "Overview", href: "/services/aitrader", icon: LayoutDashboard },
        { label: "Users", href: "/services/aitrader/users", icon: Users },
        { label: "Subscriptions", href: "/services/aitrader/subscriptions", icon: BadgeCheck },
        { label: "Settings", href: "/services/aitrader/settings", icon: Settings },
      ],
    }],
  },
  {
    id: "arena",
    label: "Arena",
    tagline: "Esports — 1v1 wagers, match betting, tournaments and marketplace",
    icon: Gamepad2,
    group: "service",
    hue: 25,
    home: "/services/arena",
    match: ["/services/arena"],
    external: { label: "Open Arena", href: "http://127.0.0.1:3600" },
    sections: [
      { label: "Run", items: [
        { label: "Overview", href: "/services/arena", icon: LayoutDashboard },
        { label: "Games", href: "/services/arena/games", icon: Gamepad2 },
        { label: "Matches", href: "/services/arena/matches", icon: Swords },
        { label: "Levels", href: "/services/arena/levels", icon: Trophy },
      ] },
      { label: "Reach & configure", items: [
        { label: "Notifications", href: "/services/arena/notifications", icon: Bell },
        { label: "Settings", href: "/services/arena/settings", icon: Settings },
      ] },
    ],
  },
  {
    id: "suite",
    label: "Suite",
    tagline: "Business finance hub — invoices, payments, payroll and treasury",
    icon: Briefcase,
    group: "service",
    hue: 100,
    home: "/services/suite",
    match: ["/services/suite"],
    external: { label: "Open Suite app", href: "http://127.0.0.1:3800" },
    sections: [{
      items: [
        { label: "Overview", href: "/services/suite", icon: LayoutDashboard },
        { label: "Settings", href: "/services/suite/settings", icon: Settings },
      ],
    }],
  },
  {
    id: "team",
    label: "Team",
    tagline: "People, roles and payroll",
    icon: UsersRound,
    group: "admin",
    hue: 135,
    chroma: 0.17,
    home: "/team",
    match: ["/team", "/payroll"],
    sections: [
      { label: "Console", items: [
        { label: "People", href: "/team", icon: UsersRound },
        { label: "Teams", href: "/team/teams", icon: Boxes },
        { label: "Roles", href: "/team/roles", icon: ShieldCheck },
      ] },
      { label: "Payroll", items: [
        { label: "Payroll", href: "/payroll", icon: Wallet, perm: "payroll.read" },
        { label: "Advances", href: "/payroll/advances", icon: HandCoins, perm: "payroll.advances" },
      ] },
    ],
  },
  {
    id: "config",
    label: "Configuration",
    tagline: "Credentials, mail, AI, plans and the scheduler",
    icon: Settings2,
    group: "admin",
    hue: 260,
    chroma: 0.05,
    home: "/apps",
    match: ["/apps", "/credentials", "/mail", "/ai", "/subscriptions", "/scheduler"],
    sections: [
      { label: "Platform", items: [
        { label: "Apps", href: "/apps", icon: Boxes },
        { label: "Credentials", href: "/credentials", icon: KeyRound },
      ] },
      { label: "Services", items: [
        { label: "Mail", href: "/mail", icon: Mail, perm: "platform.mail.read" },
        { label: "AI", href: "/ai", icon: Sparkles, perm: "platform.ai.read" },
        { label: "Subscriptions", href: "/subscriptions", icon: Layers },
        { label: "Scheduler", href: "/scheduler", icon: Timer, perm: "platform.scheduler.read" },
      ] },
    ],
  },
  {
    id: "system",
    label: "System",
    tagline: "Audit trail of every privileged action",
    icon: ScrollText,
    group: "admin",
    hue: 260,
    chroma: 0.03,
    home: "/audit",
    match: ["/audit"],
    sections: [{ items: [{ label: "Audit log", href: "/audit", icon: ScrollText }] }],
  },
];

const inScope = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(prefix + "/");

export function workspaceFor(pathname: string): Workspace {
  let best: Workspace | null = null;
  let bestLen = -1;
  for (const w of WORKSPACES) {
    for (const m of w.match) {
      if (inScope(pathname, m) && m.length > bestLen) {
        best = w;
        bestLen = m.length;
      }
    }
  }
  return best ?? WORKSPACES[0];
}

export function activeItem(ws: Workspace, pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of ws.sections.flatMap((s) => s.items)) {
    if (inScope(pathname, item.href) && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best;
}

export const visibleItems = (items: NavItem[], held: Held) =>
  items.filter((i) => !i.perm || hasPermission(held, i.perm));

export const visibleWorkspaces = (held: Held) =>
  WORKSPACES.filter((w) => w.sections.some((s) => visibleItems(s.items, held).length > 0));
