import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Spurs Earn admin SDK.
 *
 * Reads come straight from the survey schema — the control plane already owns
 * the database connection and these are analytical queries. Anything that moves
 * money, XP or standing goes through the app's internal action API instead, so
 * the business rules (payout holds, idempotent credits, strike accounting) live
 * in exactly one place. Server-only: both secrets must never reach a browser.
 */

const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);

const BASE = (process.env.SURVEY_INTERNAL_URL ?? "http://127.0.0.1:3400").replace(/\/$/, "");
const SECRET = process.env.INTERNAL_API_SECRET ?? "";

const n = (v: unknown) => Number(v ?? 0);

// ---------------------------------------------------------------- types

export interface SurveyStats {
  users: number;
  tasksLive: number;
  submissions: number;
  approvalRate: number;
  pointsOutstanding: number;
  pointsPaid: number;
  pendingReview: number;
  cashoutsPending: number;
  cashoutsOnHold: number;
  heldMinor: number;
  flagged: number;
  banned: number;
}

export interface RedemptionRow {
  id: string;
  reference: string;
  userId: string;
  name: string | null;
  email: string | null;
  points: number;
  valueMinor: number;
  status: string;
  level: number;
  trustScore: number;
  strikes: number;
  createdAt: string;
  approvedAt: string | null;
  creditAt: string | null;
  reviewedBy: string | null;
  reason: string | null;
}

export interface SubmissionRow {
  id: string;
  userId: string;
  name: string | null;
  title: string;
  kind: string;
  status: string;
  points: number;
  xp: number;
  riskScore: number;
  riskSignals: string[];
  durationSeconds: number | null;
  submittedAt: string;
}

export interface EarnerRow {
  userId: string;
  name: string | null;
  email: string | null;
  level: number;
  xp: number;
  streakDays: number;
  trustScore: number;
  strikes: number;
  status: string;
  tasksApproved: number;
  balance: number;
}

export interface RiskRow {
  id: string;
  userId: string;
  name: string | null;
  kind: string;
  severity: number;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface RevenueRow {
  provider: string;
  completions: number;
  grossUsd: number;
  userUsd: number;
  marginUsd: number;
  points: number;
}

export interface SeriesPoint { date: string; submissions: number; points: number }

// ---------------------------------------------------------------- reads

export async function stats(): Promise<SurveyStats> {
  const [users, tasksLive, subs, ledger, review, cashouts, flagged, banned] = await Promise.all([
    sql`select count(*)::int c from survey.progress`,
    sql`select count(*)::int c from survey.tasks where status='live'`,
    sql`select count(*)::int c,
               count(*) filter (where status='approved')::int approved
        from survey.submissions`,
    sql`select coalesce(sum(delta) filter (where delta > 0), 0)::int earned,
               coalesce(sum(delta), 0)::int outstanding
        from survey.points_ledger`,
    sql`select count(*)::int c from survey.submissions where status='pending'`,
    sql`select count(*) filter (where status='pending')::int pending,
               count(*) filter (where status='approved')::int hold,
               coalesce(sum(value_minor::bigint) filter (where status in ('pending','approved')), 0)::bigint held
        from survey.redemptions`,
    sql`select count(*)::int c from survey.submissions where risk_score >= 45`,
    sql`select count(*)::int c from survey.progress where status <> 'active'`,
  ]);

  const total = n(subs[0].c);
  return {
    users: n(users[0].c),
    tasksLive: n(tasksLive[0].c),
    submissions: total,
    approvalRate: total ? Math.round((n(subs[0].approved) / total) * 100) : 0,
    pointsOutstanding: n(ledger[0].outstanding),
    pointsPaid: n(ledger[0].earned),
    pendingReview: n(review[0].c),
    cashoutsPending: n(cashouts[0].pending),
    cashoutsOnHold: n(cashouts[0].hold),
    heldMinor: n(cashouts[0].held),
    flagged: n(flagged[0].c),
    banned: n(banned[0].c),
  };
}

/** The cash-out queue: awaiting review first, then the ones counting down. */
export async function redemptions(status?: string): Promise<RedemptionRow[]> {
  const rows = (await sql`
    select r.id, r.reference, r.user_id as "userId", u.name, u.email,
           r.points, r.value_minor::bigint as "valueMinor", r.status,
           coalesce(p.level, 1) as level, coalesce(p.trust_score, 50) as "trustScore",
           coalesce(p.strikes, 0) as strikes,
           r.created_at as "createdAt", r.approved_at as "approvedAt", r.credit_at as "creditAt",
           r.reviewed_by as "reviewedBy",
           coalesce(r.rejection_reason, r.failure_reason) as reason
    from survey.redemptions r
    left join spurs.users u on u.id = r.user_id
    left join survey.progress p on p.user_id = r.user_id
    ${status ? sql`where r.status = ${status}` : sql`where r.status in ('pending','approved')`}
    order by case r.status when 'pending' then 0 else 1 end, r.created_at asc
    limit 200`) as RedemptionRow[];
  return rows.map((r) => ({ ...r, valueMinor: n(r.valueMinor), points: n(r.points) }));
}

/** Submissions waiting on a human, riskiest first. */
export async function reviewQueue(): Promise<SubmissionRow[]> {
  return sql`
    select s.id, s.user_id as "userId", u.name, t.title, t.kind, s.status,
           t.points, t.xp, s.risk_score as "riskScore", s.risk_signals as "riskSignals",
           s.duration_seconds as "durationSeconds", s.submitted_at as "submittedAt"
    from survey.submissions s
    join survey.tasks t on t.id = s.task_id
    left join spurs.users u on u.id = s.user_id
    where s.status = 'pending'
    order by s.risk_score desc, s.submitted_at asc
    limit 200` as unknown as SubmissionRow[];
}

/** Everything anti-cheat has flagged, for the risk tab. */
export async function flagged(): Promise<SubmissionRow[]> {
  return sql`
    select s.id, s.user_id as "userId", u.name, t.title, t.kind, s.status,
           s.points_awarded as points, s.xp_awarded as xp,
           s.risk_score as "riskScore", s.risk_signals as "riskSignals",
           s.duration_seconds as "durationSeconds", s.submitted_at as "submittedAt"
    from survey.submissions s
    join survey.tasks t on t.id = s.task_id
    left join spurs.users u on u.id = s.user_id
    where s.risk_score > 0
    order by s.risk_score desc, s.submitted_at desc
    limit 200`as unknown as SubmissionRow[];
}

export async function riskEvents(limit = 150): Promise<RiskRow[]> {
  return sql`
    select e.id, e.user_id as "userId", u.name, e.kind, e.severity, e.action, e.detail,
           e.created_at as "createdAt"
    from survey.risk_events e
    left join spurs.users u on u.id = e.user_id
    where e.action <> 'logged'
    order by e.created_at desc
    limit ${limit}` as unknown as RiskRow[];;
}

export async function earners(limit = 100): Promise<EarnerRow[]> {
  return sql`
    select p.user_id as "userId", u.name, u.email, p.level, p.xp, p.streak_days as "streakDays",
           p.trust_score as "trustScore", p.strikes, p.status, p.tasks_approved as "tasksApproved",
           coalesce((select sum(delta) from survey.points_ledger l where l.user_id = p.user_id), 0)::int as balance
    from survey.progress p
    left join spurs.users u on u.id = p.user_id
    order by p.xp desc
    limit ${limit}` as unknown as EarnerRow[];;
}

export async function tasks() {
  return sql`
    select t.id, t.title, t.kind, t.category, t.status, t.points, t.xp, t.min_level as "minLevel",
           t.owner_type as "ownerType", t.auto_approve as "autoApprove", t.max_submissions as "maxSubmissions",
           t.created_at as "createdAt",
           (select count(*) from survey.submissions s where s.task_id = t.id)::int as submissions
    from survey.tasks t
    order by t.created_at desc
    limit 200`;
}

/** Revenue from the external networks — gross, the users' share, our margin. */
export async function revenue(days = 30): Promise<RevenueRow[]> {
  const rows = await sql`
    select provider,
           count(*)::int completions,
           coalesce(sum(gross_usd_micros::bigint), 0)::bigint gross,
           coalesce(sum(user_usd_micros::bigint), 0)::bigint "user",
           coalesce(sum(margin_usd_micros::bigint), 0)::bigint margin,
           coalesce(sum(points), 0)::int points
    from survey.provider_conversions
    where status = 'credited' and created_at > now() - (${days} || ' days')::interval
    group by provider
    order by margin desc`;
  return rows.map((r) => ({
    provider: String(r.provider),
    completions: n(r.completions),
    grossUsd: n(r.gross) / 1_000_000,
    userUsd: n(r.user) / 1_000_000,
    marginUsd: n(r.margin) / 1_000_000,
    points: n(r.points),
  }));
}

export async function series(days = 14): Promise<SeriesPoint[]> {
  const rows = await sql`
    select to_char(d.day, 'YYYY-MM-DD') as date,
           count(s.id)::int as submissions,
           coalesce(sum(s.points_awarded), 0)::int as points
    from generate_series(current_date - (${days - 1} || ' days')::interval, current_date, '1 day') d(day)
    left join survey.submissions s on s.submitted_at::date = d.day
    group by d.day
    order by d.day`;
  return rows.map((r) => ({ date: String(r.date), submissions: n(r.submissions), points: n(r.points) }));
}

export async function levelDistribution(): Promise<{ level: number; users: number }[]> {
  const rows = await sql`
    select level, count(*)::int users from survey.progress group by level order by level`;
  return rows.map((r) => ({ level: n(r.level), users: n(r.users) }));
}

// ---------------------------------------------------------------- actions

class SurveyError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function act<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/api/private/survey/admin`, {
    method: "POST",
    headers: { "x-internal-secret": SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new SurveyError(json?.error ?? `Survey API ${res.status}`, res.status);
  return json as T;
}

export interface QuestionInput {
  prompt: string;
  type: "single_choice" | "multi_choice" | "text" | "rating";
  options: string[];
  required: boolean;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  kind: string;
  category?: string;
  points: number;
  xp: number;
  estimatedMinutes: number;
  dwellSeconds?: number;
  minLevel?: number;
  maxSubmissions?: number | null;
  repeatHours?: number | null;
  autoApprove?: boolean;
  status?: "draft" | "live" | "paused" | "closed";
  actionRef?: string | null;
  targetUrl?: string | null;
  closesAt?: string | null;
  createdBy?: string;
}

export interface TaskDetail {
  task: Record<string, unknown> & { id: string; title: string };
  questions: { id: string; prompt: string; type: string; options: string[]; required: boolean }[];
  responses: number;
}

export const survey = {
  stats, redemptions, reviewQueue, flagged, riskEvents, earners, tasks, revenue, series, levelDistribution,

  approveRedemption: (id: string, reviewer: string) =>
    act<{ ok: boolean }>({ action: "redemption.approve", id, reviewer }),
  rejectRedemption: (id: string, reviewer: string, reason?: string) =>
    act<{ ok: boolean }>({ action: "redemption.reject", id, reviewer, reason }),
  /** Release every hold that has already elapsed, now. */
  processPayouts: () =>
    act<{ ok: boolean; credited: number; failed: number }>({ action: "redemption.process" }),

  approveSubmission: (id: string, reviewer: string) =>
    act<{ ok: boolean; points: number; xp: number }>({ action: "submission.approve", id, reviewer }),
  rejectSubmission: (id: string, reviewer: string, reason?: string) =>
    act<{ ok: boolean }>({ action: "submission.reject", id, reviewer, reason }),

  setStanding: (userId: string, status: "active" | "restricted" | "banned", reviewer: string, reason?: string, days?: number) =>
    act<{ ok: boolean }>({ action: "user.standing", userId, status, reviewer, reason, days }),
  adjustXp: (userId: string, delta: number, reviewer: string, reason?: string) =>
    act<{ ok: boolean }>({ action: "user.xp", userId, delta, reviewer, reason }),

  createTask: (task: TaskInput, questions: QuestionInput[]) =>
    act<{ ok: boolean; task: { id: string } }>({ action: "task.create", task, questions }),
  updateTask: (id: string, task: TaskInput, questions: QuestionInput[]) =>
    act<{ ok: boolean; task: { id: string } }>({ action: "task.update", id, task, questions }),
  setTaskStatus: (id: string, status: "draft" | "live" | "paused" | "closed") =>
    act<{ ok: boolean }>({ action: "task.status", id, status }),
  deleteTask: (id: string) => act<{ ok: boolean }>({ action: "task.delete", id }),
  getTask: (id: string) => act<TaskDetail>({ action: "task.get", id }),
};
