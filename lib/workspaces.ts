import {
  Activity, ArrowLeftRight, ArrowUpRight, BadgeCheck, Bell, Boxes, Briefcase,
  ClipboardList, CreditCard, Fingerprint, Gamepad2, Globe, HandCoins, Inbox,
  KeyRound, Layers, LayoutDashboard, ListPlus, Mail, Percent, PieChart, Receipt,
  Settings, ShieldAlert, ShieldCheck, ScrollText, SlidersHorizontal, Sparkles,
  Store, Swords, Timer, Trophy, Users, UsersRound, Wallet,
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
  anyPerm?: string[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
  sections?: NavSection[];
  defaultOpen?: boolean;
  external?: { label: string; href: string };
}

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
}

export const GROUPS: WorkspaceGroup[] = ["core", "service", "admin"];

/**
 * One console. The sidebar is organised by what you're doing (people, money,
 * reviewing, running a product), not by which service owns the data.
 */
export const WORKSPACES: Workspace[] = [
  {
    id: "console",
    label: "Spurs Admin",
    tagline: "One console for all of Spurs",
    icon: ShieldCheck,
    group: "core",
    hue: 285,
    home: "/",
    match: ["/"],
    sections: [
      {
        label: "Today",
        defaultOpen: true,
        items: [
          { label: "Inbox", href: "/inbox", icon: Inbox },
          { label: "Overview", href: "/", icon: LayoutDashboard },
        ],
      },
      {
        label: "People",
        items: [
          { label: "Customers", href: "/users", icon: Users, perm: "customers.read" },
          { label: "Identity overview", href: "/services/accounts", icon: Fingerprint, perm: "customers.read" },
          { label: "KYC", href: "/services/accounts/kyc", icon: BadgeCheck, perm: "customers.read" },
          { label: "Fraud & risk", href: "/services/accounts/fraud", icon: ShieldAlert, perm: "customers.read" },
          { label: "Security log", href: "/services/accounts/security", icon: Activity, perm: "customers.read" },
        ],
      },
      {
        label: "Money",
        items: [
          { label: "Payments", href: "/payments", icon: CreditCard, perm: "money.read" },
          { label: "Wallet transactions", href: "/transactions", icon: ArrowLeftRight, perm: "money.read" },
          { label: "Pay overview", href: "/services/pay", icon: LayoutDashboard, perm: "money.read" },
          { label: "Pay payments", href: "/services/pay/payments", icon: CreditCard, perm: "money.read" },
          { label: "Merchants", href: "/services/pay/merchants", icon: Store, perm: "money.read" },
          { label: "Payouts", href: "/services/pay/payouts", icon: ArrowUpRight, perm: "money.read" },
          { label: "Wallet overview", href: "/services/wallet", icon: Wallet, perm: "money.read" },
          { label: "Wallet holders", href: "/services/wallet/holders", icon: Users, perm: "money.read" },
          { label: "Wallet ledger", href: "/services/wallet/transactions", icon: ArrowLeftRight, perm: "money.read" },
          { label: "Wallet connections", href: "/services/wallet/connections", icon: Globe, perm: "money.read" },
          { label: "Subscriptions", href: "/subscriptions", icon: Layers, perm: "money.read" },
        ],
      },
      {
        label: "Review queues",
        defaultOpen: true,
        items: [
          { label: "Cash-outs", href: "/services/survey/cashouts", icon: Wallet, perm: "money.payouts.approve" },
          { label: "Task submissions", href: "/services/survey/review", icon: ClipboardList, perm: "ops.review" },
          { label: "Gift card trades", href: "/services/giftcards/review", icon: ShieldCheck, perm: "ops.review" },
          { label: "Salary advances", href: "/payroll/advances", icon: HandCoins, perm: "payroll.advances" },
        ],
      },
      {
        label: "Products",
        items: [],
        sections: [
          {
            label: "Earn",
            external: { label: "Open Earn app", href: "http://127.0.0.1:3400" },
            items: [
              { label: "Overview", href: "/services/survey", icon: LayoutDashboard, perm: "money.read" },
              { label: "Tasks", href: "/services/survey/tasks", icon: ListPlus, perm: "ops.tasks.manage" },
              { label: "Earners", href: "/services/survey/earners", icon: Users, perm: "customers.read" },
              { label: "Anti-cheat", href: "/services/survey/risk", icon: ShieldAlert, perm: "ops.fraud.read" },
              { label: "Networks", href: "/services/survey/networks", icon: Globe, anyPerm: ["platform.credentials.manage", "platform.settings.manage"] },
            ],
          },
          {
            label: "Gift cards",
            external: { label: "Open Gift Cards app", href: "http://127.0.0.1:3500" },
            items: [
              { label: "Overview", href: "/services/giftcards", icon: LayoutDashboard, perm: "money.read" },
              { label: "Rates", href: "/services/giftcards/rates", icon: Percent, perm: "money.rates.manage" },
              { label: "Orders", href: "/services/giftcards/orders", icon: Receipt, perm: "money.read" },
              { label: "Breakage", href: "/services/giftcards/breakage", icon: PieChart, perm: "money.read" },
            ],
          },
          {
            label: "Arena",
            external: { label: "Open Arena", href: "http://127.0.0.1:3600" },
            items: [
              { label: "Overview & disputes", href: "/services/arena", icon: LayoutDashboard, perm: "money.read" },
              { label: "Games", href: "/services/arena/games", icon: Gamepad2, perm: "platform.settings.manage" },
              { label: "Matches", href: "/services/arena/matches", icon: Swords, perm: "money.read" },
              { label: "Levels", href: "/services/arena/levels", icon: Trophy, perm: "money.adjust" },
              { label: "Notifications", href: "/services/arena/notifications", icon: Bell, perm: "platform.mail.manage" },
              { label: "Arena settings", href: "/services/arena/settings", icon: Settings, perm: "platform.credentials.manage" },
            ],
          },
          {
            label: "AI Trader",
            external: { label: "Open Trader console", href: "http://127.0.0.1:3800" },
            items: [
              { label: "Overview", href: "/services/aitrader", icon: LayoutDashboard },
              { label: "Users", href: "/services/aitrader/users", icon: Users },
              { label: "Subscriptions", href: "/services/aitrader/subscriptions", icon: BadgeCheck },
              { label: "AI Trader settings", href: "/services/aitrader/settings", icon: Settings },
            ],
          },
          {
            label: "Suite & Cloud",
            items: [
              { label: "Suite", href: "/services/suite", icon: Briefcase },
              { label: "Cloud", href: "/services/cloud", icon: Globe },
            ],
          },
        ],
      },
      {
        label: "Team",
        items: [
          { label: "People", href: "/team", icon: UsersRound },
          { label: "Teams", href: "/team/teams", icon: Boxes },
          { label: "Console roles", href: "/team/roles", icon: ShieldCheck },
          { label: "Payroll", href: "/payroll", icon: Wallet, perm: "payroll.read" },
        ],
      },
      {
        label: "Settings",
        items: [],
        sections: [
          {
            label: "Service settings",
            items: [
              { label: "Pay providers", href: "/services/pay/providers", icon: SlidersHorizontal, perm: "platform.credentials.manage" },
              { label: "Pay settings", href: "/services/pay/settings", icon: Settings, perm: "platform.settings.manage" },
              { label: "Wallet settings", href: "/services/wallet/settings", icon: Settings, perm: "platform.settings.manage" },
              { label: "Account settings", href: "/services/accounts/settings", icon: Settings, perm: "platform.settings.manage" },
              { label: "Customer roles", href: "/services/accounts/roles", icon: ShieldCheck, perm: "console.roles.manage" },
              { label: "Suite settings", href: "/services/suite/settings", icon: Settings, perm: "platform.settings.manage" },
            ],
          },
          {
            label: "Platform",
            items: [
              { label: "Apps", href: "/apps", icon: Boxes },
              { label: "Credentials", href: "/credentials", icon: KeyRound, perm: "platform.credentials.manage" },
              { label: "Mail", href: "/mail", icon: Mail, perm: "platform.mail.read" },
              { label: "AI", href: "/ai", icon: Sparkles, perm: "platform.ai.read" },
              { label: "Scheduler", href: "/scheduler", icon: Timer, perm: "platform.scheduler.read" },
              { label: "Audit log", href: "/audit", icon: ScrollText, perm: "console.audit.read" },
            ],
          },
        ],
      },
    ],
  },
];

const inScope = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(prefix + "/");

export function workspaceFor(pathname: string): Workspace {
  let best: Workspace | null = null;
  let bestLen = -1;
  for (const workspace of WORKSPACES) {
    for (const match of workspace.match) {
      if (inScope(pathname, match) && match.length > bestLen) {
        best = workspace;
        bestLen = match.length;
      }
    }
  }
  return best ?? WORKSPACES[0];
}

/** The nav item for the current page: the longest matching href wins. */
export function activeItem(workspace: Workspace, pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of flattenSections(workspace.sections).flatMap((section) => section.items)) {
    if (inScope(pathname, item.href) && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best;
}

/** The sidebar section the current page lives in. */
export function sectionFor(workspace: Workspace, pathname: string): NavSection | null {
  const item = activeItem(workspace, pathname);
  if (!item) return null;
  return flattenSections(workspace.sections).findLast((section) =>
    section.items.some((entry) => entry.href === item.href),
  ) ?? null;
}

function flattenSections(sections: NavSection[]): NavSection[] {
  return sections.flatMap((section) => [section, ...flattenSections(section.sections ?? [])]);
}

export const visibleItems = (items: NavItem[], held: Held) =>
  items.filter((item) =>
    (!item.perm || hasPermission(held, item.perm)) &&
    (!item.anyPerm || item.anyPerm.some((permission) => hasPermission(held, permission))),
  );

export const visibleWorkspaces = (held: Held) =>
  WORKSPACES.filter((workspace) =>
    flattenSections(workspace.sections).some((section) => visibleItems(section.items, held).length > 0),
  );

export const canOpenInbox = (held: Held) =>
  ["ops.review", "money.payouts.approve", "payroll.advances"].some((permission) =>
    hasPermission(held, permission),
  );
