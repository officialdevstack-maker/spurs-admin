/**
 * What a console user is allowed to do.
 *
 * This is the admin console's own RBAC, and it is deliberately separate from
 * the platform RBAC in `accounts/`. Those roles govern Spurs *customers* —
 * whether someone is a merchant, what they can do in Pay or Wallet. These
 * govern *staff*: who may approve a payout, change a rate, or read a card code.
 * Conflating the two would let a customer role grant console access.
 *
 * The catalogue lives in code because a permission only means something if
 * there's a check referencing it — inventing rows in a table would create
 * permissions that grant nothing. Roles, by contrast, are data: they're
 * composed in the console without a deploy.
 *
 * No imports: safe to use from client components for showing and hiding UI.
 * Hiding a button is a courtesy, never the enforcement — every action
 * re-checks on the server.
 */

export interface Permission {
  key: string;
  label: string;
  /** What granting this actually lets someone do, in plain terms. */
  detail: string;
  /** Money, standing, or secrets are at stake — grant with intent. */
  sensitive?: boolean;
}

export interface PermissionGroup {
  group: string;
  description: string;
  permissions: Permission[];
}

export const PERMISSION_CATALOGUE: PermissionGroup[] = [
  {
    group: "Console",
    description: "Getting in, and administering the console itself.",
    permissions: [
      { key: "console.access", label: "Sign in", detail: "Open the admin console at all." },
      { key: "console.admins.manage", label: "Manage admins", detail: "Invite, deactivate and edit console users.", sensitive: true },
      { key: "console.roles.manage", label: "Manage roles", detail: "Create roles and change what they permit.", sensitive: true },
      { key: "console.teams.manage", label: "Manage teams", detail: "Create teams and change who's in them." },
      { key: "console.audit.read", label: "Read the audit log", detail: "See every privileged action taken." },
    ],
  },
  {
    group: "Customers",
    description: "The people using Spurs.",
    permissions: [
      { key: "customers.read", label: "View customers", detail: "Browse accounts and their details." },
      { key: "customers.roles.assign", label: "Assign customer roles", detail: "Change what a customer may do across Spurs.", sensitive: true },
      { key: "customers.kyc.review", label: "Review KYC", detail: "Approve or reject identity verification.", sensitive: true },
      { key: "customers.suspend", label: "Suspend customers", detail: "Restrict or ban an account.", sensitive: true },
    ],
  },
  {
    group: "Money",
    description: "Anything that moves real value.",
    permissions: [
      { key: "money.read", label: "View transactions", detail: "See payments, payouts, wallets and ledgers." },
      { key: "money.payouts.approve", label: "Approve payouts", detail: "Release cash-outs and settlements.", sensitive: true },
      { key: "money.refund", label: "Issue refunds", detail: "Refund a payment or return credit.", sensitive: true },
      { key: "money.rates.manage", label: "Set rates", detail: "Change buy rates, bonuses and conversion rates.", sensitive: true },
      { key: "money.adjust", label: "Adjust balances", detail: "Grant or claw back points, XP and credit.", sensitive: true },
    ],
  },
  {
    group: "Operations",
    description: "Day-to-day review work.",
    permissions: [
      { key: "ops.review", label: "Review submissions", detail: "Work the task, trade and verification queues." },
      { key: "ops.cards.reveal", label: "Reveal card codes", detail: "See the code on a submitted gift card — the value itself.", sensitive: true },
      { key: "ops.tasks.manage", label: "Manage tasks", detail: "Create and publish earning tasks." },
      { key: "ops.fraud.read", label: "View anti-fraud", detail: "See risk scores, signals and enforcement." },
    ],
  },
  {
    group: "People",
    description: "The staff directory and the day-to-day, in Spurs Team.",
    permissions: [
      { key: "team.access", label: "Open Spurs Team", detail: "Sign into the team app at all." },
      { key: "team.directory.read", label: "View the directory", detail: "See colleagues, their teams, timezones and hours." },
      { key: "team.staff.manage", label: "Manage staff records", detail: "Add people, edit employment details and bank accounts.", sensitive: true },
      { key: "team.leave.review", label: "Approve leave", detail: "Approve or decline time-off requests." },
      { key: "team.rota.manage", label: "Manage the rota", detail: "Schedule and change coverage shifts." },
      { key: "team.tasks.manage", label: "Assign work", detail: "Create tasks and assign them to people or teams." },
      { key: "team.notices.post", label: "Post notices", detail: "Publish company announcements, optionally by email." },
    ],
  },
  {
    group: "Payroll",
    description: "Salaries. Split deliberately — preparing, approving and paying are three separate permissions.",
    permissions: [
      { key: "payroll.read", label: "View payroll", detail: "See runs, payslips and what payroll costs.", sensitive: true },
      { key: "payroll.build", label: "Prepare payroll", detail: "Build and rebuild the monthly draft.", sensitive: true },
      { key: "payroll.approve", label: "Approve payroll", detail: "Sign off a run. Should not be the same person who prepared it.", sensitive: true },
      { key: "payroll.pay", label: "Release payments", detail: "Send the money to staff bank accounts. The last gate before funds leave.", sensitive: true },
      { key: "payroll.advances", label: "Review salary advances", detail: "Approve or decline requests to draw pay early.", sensitive: true },
      { key: "payroll.settings", label: "Change payroll settings", detail: "Edit tax bands, pension and NHF rates.", sensitive: true },
    ],
  },
  {
    group: "Support",
    description: "The help centre and the customer ticket queue.",
    permissions: [
      { key: "support.agent", label: "Answer tickets", detail: "Open the agent console and reply to customers." },
      { key: "support.articles.manage", label: "Write help articles", detail: "Create and publish the help centre — and what the assistant may say." },
      { key: "support.tickets.assign", label: "Assign tickets", detail: "Move tickets between agents and change priority." },
    ],
  },
  {
    group: "Platform",
    description: "Configuration that affects every app.",
    permissions: [
      { key: "platform.settings.manage", label: "Change settings", detail: "Edit app settings across the platform.", sensitive: true },
      { key: "platform.credentials.manage", label: "Manage credentials", detail: "Read and rotate API keys and secrets.", sensitive: true },
      { key: "platform.mail.manage", label: "Manage mail", detail: "Configure the mail provider and sending identity.", sensitive: true },
      { key: "platform.mail.read", label: "View mail log", detail: "See what the platform has emailed, and to whom." },
      { key: "platform.ai.manage", label: "Manage AI", detail: "Choose the model provider, hold its key, and set spend limits.", sensitive: true },
      { key: "platform.ai.read", label: "View AI usage", detail: "See what the platform is spending on model calls." },
      { key: "platform.scheduler.read", label: "View the scheduler", detail: "See what runs on a timer and whether it's actually running." },
      { key: "platform.scheduler.manage", label: "Control the scheduler", detail: "Pause jobs, change intervals and trigger a run by hand.", sensitive: true },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOGUE.flatMap((g) => g.permissions);
export const ALL_PERMISSION_KEYS: string[] = ALL_PERMISSIONS.map((p) => p.key);

const BY_KEY = new Map(ALL_PERMISSIONS.map((p) => [p.key, p]));
export const permissionInfo = (key: string): Permission | null => BY_KEY.get(key) ?? null;

/** Roles that ship with the console and can't be deleted. */
export interface SystemRole {
  slug: string;
  label: string;
  description: string;
  /** `"*"` means every permission, including ones added later. */
  permissions: string[] | "*";
}

export const SYSTEM_ROLES: SystemRole[] = [
  {
    slug: "superadmin",
    label: "Superadmin",
    description: "Unrestricted. Holds every permission, including any added in future.",
    permissions: "*",
  },
  {
    slug: "staff",
    label: "Staff",
    description: "Reads most things and works the review queues, but can't move money or change platform config.",
    permissions: [
      "console.access", "customers.read", "money.read",
      "ops.review", "ops.fraud.read", "platform.mail.read",
      // Everyone needs the team app and the directory to do their job; nothing
      // that touches salaries is granted by default.
      "team.access", "team.directory.read",
    ],
  },
];

/**
 * Does this set of permissions satisfy the requirement?
 * `"*"` is the superadmin wildcard and satisfies everything.
 */
export function hasPermission(held: string[] | "*", required: string): boolean {
  if (held === "*") return true;
  return held.includes("*") || held.includes(required);
}

export const hasAny = (held: string[] | "*", required: string[]): boolean =>
  required.some((r) => hasPermission(held, r));
