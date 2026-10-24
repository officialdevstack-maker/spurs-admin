// Spurs Admin control-plane schema. Admin has its OWN database and OWN auth,
// deliberately outside the shared Spurs session — a control plane shouldn't
// depend on the identity system it administers.
import { pgSchema, text, uuid, boolean, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const admin = pgSchema("admin");

/** Who can sign into the admin console. Local credentials, not Spurs SSO. */
export const admins = admin.table("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"), // superadmin | staff
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** The registry of Spurs apps admin governs. */
export const apps = admin.table("apps", {
  id: text("id").primaryKey(),               // slug: accounts | baas | pay | wallet | cloud | survey
  name: text("name").notNull(),
  baseUrl: text("base_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Every credential/config value the platform uses — the source of truth. */
export const credentials = admin.table(
  "credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: text("app_id").notNull().default("global"), // an app slug, or "global"
    key: text("key").notNull(),                         // INTERNAL_API_SECRET, PAY_PROVIDER, …
    valueEncrypted: text("value_encrypted").notNull(),  // AES-256-GCM
    scope: text("scope").notNull().default("all"),      // all | test | live
    secret: boolean("secret").notNull().default(true),  // hide value in the UI by default
    description: text("description"),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("credentials_app_key_scope_idx").on(t.appId, t.key, t.scope)],
);

/** Subscription plans (tiers) for paid apps — admin-managed, DB-driven so they
 *  can be created/edited without code changes. The app renders these dynamically. */
export const plans = admin.table(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: text("app_id").notNull(),                                 // "aitrader"
    code: text("code").notNull(),                                    // slug: "free" | "pro" | custom
    name: text("name").notNull(),
    priceMinorNgn: integer("price_minor_ngn").notNull().default(0),  // 0 = free
    tradeLimit: integer("trade_limit").notNull().default(0),         // 0 = unlimited
    tradePeriod: text("trade_period").notNull().default("month"),    // day | week | month
    features: text("features"),                                      // newline-separated
    active: boolean("active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),       // fallback plan for users with no subscription
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("plans_app_code_idx").on(t.appId, t.code)],
);

/** Per-user subscriptions for paid apps (e.g. the AI Trader). Charged from the
 *  user's Spurs Wallet; the app reads the effective plan to gate features. */
export const subscriptions = admin.table(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: text("app_id").notNull(),      // e.g. "aitrader"
    userId: text("user_id").notNull(),    // Spurs user sub
    plan: text("plan").notNull().default("free"),
    active: boolean("active").notNull().default(false),
    renewsAt: timestamp("renews_at", { withTimezone: true }),
    tradeLimit: integer("trade_limit").notNull().default(0),        // trades allowed per period (0 = unlimited)
    tradePeriod: text("trade_period").notNull().default("month"),   // day | week | month
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("subscriptions_app_user_idx").on(t.appId, t.userId)],
);

/** Every privileged action, for accountability. */
export const auditLog = admin.table(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id"),
    adminEmail: text("admin_email"),
    action: text("action").notNull(),
    target: text("target"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const customerNotes = admin.table(
  "customer_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("customer_notes_user_created_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ roles */

/**
 * Console roles. The permission *catalogue* lives in code (a permission is only
 * real if something checks it); roles are data, so they can be composed here
 * without a deploy.
 *
 * Separate from the platform roles in `accounts/` on purpose — those govern
 * customers, these govern staff.
 */
export const adminRoles = admin.table(
  "admin_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    /** Ships with the console: editable in part, never deletable. */
    isSystem: boolean("is_system").notNull().default(false),
    /** Given to new admins when an invite doesn't name a role. */
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("admin_roles_slug_idx").on(t.slug)],
);

/** Which permissions a role grants. Keys reference lib/permissions.ts. */
export const adminRolePermissions = admin.table(
  "admin_role_permissions",
  {
    roleSlug: text("role_slug").notNull(),
    permissionKey: text("permission_key").notNull(),
  },
  (t) => [uniqueIndex("admin_role_perm_idx").on(t.roleSlug, t.permissionKey)],
);

/* ------------------------------------------------------------------ teams */

/**
 * A team of admins. Teams exist to answer two questions the console kept
 * needing: who owns this service, and who should hear about it when something
 * happens. Ownership drives the alerting, so a team without members is a
 * service nobody is watching.
 */
export const teams = admin.table(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Where alerts for this team go. Falls back to each member's address. */
    alertEmail: text("alert_email"),
    /** Apps this team owns, by slug — pay, wallet, survey, giftcards … */
    apps: jsonb("apps").$type<string[]>().default([]).notNull(),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("teams_slug_idx").on(t.slug)],
);

export const teamMembers = admin.table(
  "team_members",
  {
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    adminId: uuid("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
    /** lead | member — a lead can manage the team's membership. */
    role: text("role").notNull().default("member"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("team_member_idx").on(t.teamId, t.adminId),
    index("team_member_admin_idx").on(t.adminId),
  ],
);

/**
 * An invitation to join the console. The token is stored hashed — a leaked
 * database must not hand anyone an admin account. Single use, and it expires.
 */
export const adminInvites = admin.table(
  "admin_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").notNull().default("staff"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    tokenHash: text("token_hash").notNull(),
    invitedBy: text("invited_by"),
    /** pending | accepted | revoked | expired */
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("invite_token_idx").on(t.tokenHash),
    index("invite_email_idx").on(t.email),
  ],
);

/* ------------------------------------------------------------------ staff */

/**
 * The employment record behind a console account.
 *
 * Kept apart from `admins` on purpose: that table is about who can sign in,
 * this one is about who works here. Someone can have a login and no employment
 * record (a contractor with console access), or leave the company and keep the
 * record for payroll history after their login is deactivated.
 *
 * Bank details live here because payroll pays to real accounts through Spurs
 * Pay. Treat every column below as sensitive.
 */
export const staffProfiles = admin.table(
  "staff_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
    employeeNo: text("employee_no").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    jobTitle: text("job_title"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    /** full_time | part_time | contract | intern | nysc */
    employmentType: text("employment_type").notNull().default("full_time"),
    /** active | on_leave | suspended | exited */
    status: text("status").notNull().default("active"),
    startDate: text("start_date"),                       // YYYY-MM-DD
    endDate: text("end_date"),

    /**
     * Remote-first. The team is distributed, so where someone is and when they
     * overlap with everyone else matters more than whether they turned up
     * somewhere. Every date and rota is rendered against this timezone.
     */
    timezone: text("timezone").notNull().default("Africa/Lagos"),
    country: text("country").notNull().default("NG"),
    /** remote | hybrid | onsite */
    workMode: text("work_mode").notNull().default("remote"),
    /** The hours they're normally reachable, in their own timezone. */
    workStart: text("work_start").notNull().default("09:00"),
    workEnd: text("work_end").notNull().default("17:00"),
    /** Working days, 1 = Monday … 7 = Sunday. */
    workDays: jsonb("work_days").$type<number[]>().default([1, 2, 3, 4, 5]).notNull(),

    /** salary (monthly) | hourly | none (unpaid or paid outside Spurs) */
    payType: text("pay_type").notNull().default("salary"),
    /** Monthly gross in kobo, before allowances and deductions. */
    monthlyGrossMinor: text("monthly_gross_minor").notNull().default("0"),
    hourlyRateMinor: text("hourly_rate_minor").notNull().default("0"),
    /**
     * Recurring allowances in kobo, e.g. { transport: 3000000, data: 1500000 }.
     * Transport and data are near-universal in Nigerian packages, so they're a
     * first-class part of the run rather than an afterthought.
     */
    allowances: jsonb("allowances").$type<Record<string, number>>().default({}).notNull(),

    /** Bank details for payout, via Spurs Pay. */
    bankCode: text("bank_code"),
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    accountName: text("account_name"),

    /** Nigerian statutory identifiers. */
    tin: text("tin"),                                    // tax ID
    pensionPin: text("pension_pin"),                     // RSA PIN
    pensionAdmin: text("pension_admin"),                 // PFA name
    nhfNumber: text("nhf_number"),
    /** Opt-outs, for staff a given deduction genuinely doesn't apply to. */
    pensionExempt: boolean("pension_exempt").notNull().default(false),
    nhfExempt: boolean("nhf_exempt").notNull().default(true),

    /** Annual leave entitlement in working days. Statutory floor is 6. */
    leaveDaysPerYear: integer("leave_days_per_year").notNull().default(20),
    nextOfKin: text("next_of_kin"),
    nextOfKinPhone: text("next_of_kin_phone"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("staff_employee_no_idx").on(t.employeeNo),
    index("staff_admin_idx").on(t.adminId),
    index("staff_status_idx").on(t.status),
  ],
);

/** One month's payroll. Nothing pays until it's approved. */
export const payrollRuns = admin.table(
  "payroll_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    period: text("period").notNull(),                    // YYYY-MM
    /** draft | approved | paying | paid | partly_paid | cancelled */
    status: text("status").notNull().default("draft"),
    grossMinor: text("gross_minor").notNull().default("0"),
    deductionsMinor: text("deductions_minor").notNull().default("0"),
    netMinor: text("net_minor").notNull().default("0"),
    /** What the company owes on top: employer pension, NSITF, ITF. */
    employerCostMinor: text("employer_cost_minor").notNull().default("0"),
    headcount: integer("headcount").notNull().default(0),
    notes: text("notes"),
    createdBy: text("created_by"),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("payroll_period_idx").on(t.period)],
);

/**
 * One person's pay for one run — effectively their payslip.
 *
 * Every figure is stored rather than recomputed on read: tax rules change, and
 * a payslip from March must still show what March actually paid.
 */
export const payrollItems = admin.table(
  "payroll_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "restrict" }),

    basicMinor: text("basic_minor").notNull().default("0"),
    allowances: jsonb("allowances").$type<Record<string, number>>().default({}).notNull(),
    grossMinor: text("gross_minor").notNull().default("0"),

    /** Statutory deductions, each stored so a payslip can itemise them. */
    pensionEmployeeMinor: text("pension_employee_minor").notNull().default("0"),
    pensionEmployerMinor: text("pension_employer_minor").notNull().default("0"),
    nhfMinor: text("nhf_minor").notNull().default("0"),
    payeMinor: text("paye_minor").notNull().default("0"),
    /** Advance repayments and anything else withheld this month. */
    otherDeductions: jsonb("other_deductions").$type<Record<string, number>>().default({}).notNull(),

    netMinor: text("net_minor").notNull().default("0"),
    /** Hours worked, for hourly staff. */
    hours: text("hours"),

    /** pending | paid | failed | skipped */
    payoutStatus: text("payout_status").notNull().default("pending"),
    payoutRef: text("payout_ref"),
    payoutError: text("payout_error"),
    /** How the tax was worked out, kept for audit. */
    breakdown: jsonb("breakdown").$type<Record<string, unknown>>().default({}).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("payroll_item_idx").on(t.runId, t.staffId),
    index("payroll_item_staff_idx").on(t.staffId),
  ],
);

/**
 * Salary advances — asking for part of your pay early.
 *
 * Common enough in Nigeria that leaving it out means it happens over WhatsApp
 * and never reaches the books. Repayments are withheld from future runs.
 */
export const salaryAdvances = admin.table(
  "salary_advances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
    amountMinor: text("amount_minor").notNull(),
    reason: text("reason"),
    /** Spread the repayment over this many monthly runs. */
    months: integer("months").notNull().default(1),
    repaidMinor: text("repaid_minor").notNull().default("0"),
    /** pending | approved | rejected | repaying | repaid | written_off */
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    rejectionReason: text("rejection_reason"),
    payoutRef: text("payout_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [index("advance_staff_idx").on(t.staffId), index("advance_status_idx").on(t.status)],
);

/* ----------------------------------------------------------- coordination */

/** Time off. */
export const leaveRequests = admin.table(
  "leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
    /** annual | sick | maternity | paternity | compassionate | unpaid */
    type: text("type").notNull().default("annual"),
    startDate: text("start_date").notNull(),             // YYYY-MM-DD
    endDate: text("end_date").notNull(),
    /** Working days, excluding weekends and public holidays. */
    days: integer("days").notNull().default(1),
    reason: text("reason"),
    /** pending | approved | rejected | cancelled */
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("leave_staff_idx").on(t.staffId), index("leave_status_idx").on(t.status)],
);

/**
 * The working day — one row per person per day.
 *
 * Remote-first, so this is a work log, not a turnstile. Nobody is marked "late"
 * for starting at 11 if that's when their day starts; what's recorded is time
 * worked and a short async note, which is what actually helps a distributed
 * team and what hourly pay is computed from.
 */
export const attendance = admin.table(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
    day: text("day").notNull(),                          // YYYY-MM-DD, in the staff member's timezone
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** Time worked. The source of truth for hourly pay. */
    minutes: integer("minutes").notNull().default(0),
    /** working | done | day_off | leave | holiday | absent */
    status: text("status").notNull().default("working"),
    /** The async stand-up: what they're on today, and anything blocking them. */
    checkIn: text("check_in"),
    blockers: text("blockers"),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("attendance_staff_day_idx").on(t.staffId, t.day),
    index("attendance_day_idx").on(t.day),
  ],
);

/**
 * Coverage windows, for a team spread across timezones.
 *
 * Stored in UTC rather than local time: "09:00" means nothing on a rota where
 * people sit in Lagos, Nairobi and London, and the whole point is knowing who
 * is actually reachable at a given moment.
 */
export const shifts = admin.table(
  "shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
    day: text("day").notNull(),                          // YYYY-MM-DD (UTC)
    /** Coverage window in UTC, rendered into each viewer's own timezone. */
    startsAtUtc: timestamp("starts_at_utc", { withTimezone: true }).notNull(),
    endsAtUtc: timestamp("ends_at_utc", { withTimezone: true }).notNull(),
    /** Which team's rota this belongs to. */
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    role: text("role"),                                  // "support", "on-call", …
    note: text("note"),
    createdBy: text("created_by"),
  },
  (t) => [index("shift_day_idx").on(t.day), index("shift_staff_idx").on(t.staffId)],
);

/** Work assigned to a person or a team. */
export const staffTasks = admin.table(
  "staff_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    detail: text("detail"),
    assigneeId: uuid("assignee_id").references(() => staffProfiles.id, { onDelete: "set null" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    /** todo | doing | blocked | done | cancelled */
    status: text("status").notNull().default("todo"),
    /** low | normal | high | urgent */
    priority: text("priority").notNull().default("normal"),
    dueDate: text("due_date"),                           // YYYY-MM-DD
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("task_assignee_idx").on(t.assigneeId, t.status),
    index("task_team_idx").on(t.teamId, t.status),
  ],
);

/** Company notices. Optionally emailed through the platform mailer. */
export const announcements = admin.table(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** all | a team's id */
    audience: text("audience").notNull().default("all"),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    pinned: boolean("pinned").notNull().default(false),
    emailed: boolean("emailed").notNull().default(false),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("announcement_created_idx").on(t.createdAt)],
);

/**
 * Public holidays. Nigeria's calendar shifts every year — the Islamic dates
 * move, and the government declares them at short notice — so this is data,
 * never a hardcoded list.
 */
export const holidays = admin.table(
  "holidays",
  {
    day: text("day").primaryKey(),                       // YYYY-MM-DD
    name: text("name").notNull(),
    createdBy: text("created_by"),
  },
);

/* ------------------------------------------------------------------- mail */

/**
 * Every email the platform sends, from any app.
 *
 * Mail runs through admin rather than each app talking to a provider directly:
 * one place holds the credentials, one place renders the templates so every
 * Spurs email looks the same, and one place can answer "did that person
 * actually get it?" — which is the question support always asks.
 */
export const mailLog = admin.table(
  "mail_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Which app asked for it: accounts | pay | wallet | survey | giftcards | admin */
    app: text("app").notNull(),
    template: text("template").notNull(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    /** queued | sent | failed | suppressed */
    status: text("status").notNull().default("queued"),
    provider: text("provider"),
    /** The provider's own id, for chasing things up with them. */
    providerRef: text("provider_ref"),
    /**
     * Caller-supplied key. Sending is idempotent on it, so a retried job or a
     * double-clicked button can't email someone twice.
     */
    idempotencyKey: text("idempotency_key"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    /** Template variables, kept for support — never the rendered body. */
    context: jsonb("context").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("mail_idempotency_idx").on(t.idempotencyKey),
    index("mail_to_idx").on(t.to),
    index("mail_app_idx").on(t.app),
    index("mail_status_idx").on(t.status),
  ],
);

/**
 * Addresses we must stop mailing — hard bounces, complaints, and explicit
 * opt-outs. Checked before every send. Continuing to mail a bounced address is
 * how a sending domain's reputation dies.
 */
export const mailSuppressions = admin.table(
  "mail_suppressions",
  {
    email: text("email").primaryKey(),
    /** bounce | complaint | unsubscribe | manual */
    reason: text("reason").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

/* --------------------------------------------------------------------- ai */

/**
 * Every model call the platform makes, from any app.
 *
 * Tokens cost money and models occasionally say something they shouldn't, so
 * this exists for two questions that always get asked eventually: what is this
 * costing, and what exactly did it say that time. The prompt is not stored —
 * it can contain whatever a customer typed, including things they shouldn't
 * have — only its size, the reply, and where it came from.
 */
export const aiUsage = admin.table(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Which app asked: support | admin | survey … */
    app: text("app").notNull(),
    /** What for: support.assistant | fraud.summary … */
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    /** Milliseconds, so a provider going slow is visible before it times out. */
    latencyMs: integer("latency_ms").notNull().default(0),
    ok: boolean("ok").notNull().default(true),
    error: text("error"),
    /** The caller's own reference, for tracing back to a conversation. */
    reference: text("reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ai_usage_app_idx").on(t.app, t.createdAt),
    index("ai_usage_created_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------- scheduler */

/**
 * Work that has to happen on a timer.
 *
 * Every service had an endpoint that released money — matured cash-outs, gift
 * card settlements, mail retries — and nothing called any of them. Money only
 * moved when someone clicked a button. This table is the fix: one place that
 * knows what runs, how often, and whether it actually did.
 *
 * The schedule is data, so adding a job later is a row here rather than a new
 * cron entry on a server nobody remembers to update.
 */
export const scheduledJobs = admin.table(
  "scheduled_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable identifier the code registers against. */
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    /** How often to run, in seconds. */
    intervalSeconds: integer("interval_seconds").notNull().default(300),
    enabled: boolean("enabled").notNull().default(true),

    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    /** ok | failed | running | never */
    lastStatus: text("last_status").notNull().default("never"),
    lastError: text("last_error"),
    lastDurationMs: integer("last_duration_ms").notNull().default(0),
    /** What the job reported — "3 credited, 0 failed". */
    lastResult: text("last_result"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Consecutive failures. Drives backoff, and the count that says "this has
     * been broken for a while" rather than "it blipped once".
     */
    failures: integer("failures").notNull().default(0),
    runs: integer("runs").notNull().default(0),
  },
  (t) => [
    uniqueIndex("scheduled_jobs_key_idx").on(t.key),
    index("scheduled_jobs_due_idx").on(t.enabled, t.nextRunAt),
  ],
);

/**
 * The scheduler's own pulse.
 *
 * The failure nobody notices is the ticker itself dying: every job looks fine,
 * because none of them ran. One row, updated on every tick, so the console can
 * say "nothing has run for 40 minutes" instead of showing a wall of green.
 */
export const schedulerHeartbeat = admin.table("scheduler_heartbeat", {
  id: text("id").primaryKey().default("singleton"),
  lastTickAt: timestamp("last_tick_at", { withTimezone: true }).defaultNow().notNull(),
  ticks: integer("ticks").notNull().default(0),
});

export type Admin = typeof admins.$inferSelect;
export type AiUsage = typeof aiUsage.$inferSelect;
export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type App = typeof apps.$inferSelect;
export type Credential = typeof credentials.$inferSelect;
export type AdminRole = typeof adminRoles.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type AdminInvite = typeof adminInvites.$inferSelect;
export type StaffProfile = typeof staffProfiles.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollItem = typeof payrollItems.$inferSelect;
export type SalaryAdvance = typeof salaryAdvances.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type StaffTask = typeof staffTasks.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type MailLog = typeof mailLog.$inferSelect;
export type MailSuppression = typeof mailSuppressions.$inferSelect;
