import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Spurs Gift Cards admin SDK.
 *
 * Reads come straight from the giftcards schema — the control plane already
 * owns the connection and these are analytical queries. Anything that approves
 * a trade, moves money or changes a rate goes through the app's internal action
 * API, so the rules (no payout before verification, versioned rates) live in
 * one place. Server-only: neither secret may reach a browser.
 */

const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);

const BASE = (process.env.GIFTCARDS_INTERNAL_URL ?? "http://127.0.0.1:3500").replace(/\/$/, "");
const SECRET = process.env.INTERNAL_API_SECRET ?? "";

const n = (v: unknown) => Number(v ?? 0);

export const naira = (minor: string | number) => {
  const s = BigInt(minor || 0);
  const neg = s < BigInt(0);
  const abs = (neg ? -s : s).toString().padStart(3, "0");
  const whole = abs.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}₦${whole}.${abs.slice(-2)}`;
};

/* ------------------------------------------------------------------ types */

export interface GiftcardStats {
  /** Face value of every card we've issued. */
  issuedMinor: string;
  /** Still sitting on unredeemed cards — our outstanding liability. */
  outstandingMinor: string;
  /** Credit balances people hold right now. */
  creditLiabilityMinor: string;
  cardsIssued: number;
  cardsUnused: number;
  ordersPaid: number;
  tradesAwaitingReview: number;
  tradesPaidMinor: string;
  creditSpentMinor: string;
  jobsOverdue: number;
  jobsFailed: number;
}

export interface TradeRow {
  id: string;
  reference: string;
  userId: string;
  name: string | null;
  email: string | null;
  brand: string;
  faceValue: number;
  faceCurrency: string;
  payoutType: string;
  quotedMinor: string;
  status: string;
  riskScore: number;
  signals: string[];
  hasImages: boolean;
  createdAt: string;
}

export interface RateRow {
  brandId: string;
  slug: string;
  brand: string;
  notes: string | null;
  active: boolean;
  autoVerify: boolean;
  requires: string;
  rateId: string | null;
  buyMinorPerUnit: string | null;
  creditBonusPct: number | null;
  faceCurrency: string | null;
  minFace: number | null;
  maxFace: number | null;
  updatedBy: string | null;
  rateSetAt: string | null;
}

export interface BreakageRow {
  app: string;
  spendCount: number;
  spentMinor: string;
}

/* ------------------------------------------------------------------ reads */

export async function stats(): Promise<GiftcardStats> {
  const [cards, credit, orders, trades, jobs] = await Promise.all([
    sql`select count(*)::int total,
               count(*) filter (where status = 'active')::int unused,
               coalesce(sum(face_minor::numeric), 0)::text issued,
               coalesce(sum(balance_minor::numeric) filter (where status = 'active'), 0)::text outstanding
        from giftcards.codes`,
    sql`select coalesce(sum(delta::numeric), 0)::text liability,
               coalesce(sum(-delta::numeric) filter (where delta::numeric < 0), 0)::text spent
        from giftcards.credit_ledger`,
    sql`select count(*)::int c from giftcards.orders where status in ('paid','fulfilled')`,
    sql`select count(*) filter (where status in ('submitted','checking','needs_review'))::int review,
               coalesce(sum(payout_minor::numeric) filter (where status = 'paid'), 0)::text paid
        from giftcards.trades`,
    sql`select count(*) filter (where status = 'queued' and run_at < now() - interval '5 minutes')::int overdue,
               count(*) filter (where status = 'failed')::int failed
        from giftcards.jobs`,
  ]);

  return {
    issuedMinor: String(cards[0].issued),
    outstandingMinor: String(cards[0].outstanding),
    creditLiabilityMinor: String(credit[0].liability),
    creditSpentMinor: String(credit[0].spent),
    cardsIssued: n(cards[0].total),
    cardsUnused: n(cards[0].unused),
    ordersPaid: n(orders[0].c),
    tradesAwaitingReview: n(trades[0].review),
    tradesPaidMinor: String(trades[0].paid),
    jobsOverdue: n(jobs[0].overdue),
    jobsFailed: n(jobs[0].failed),
  };
}

/** Trades waiting on a human, riskiest first. */
export async function reviewQueue(): Promise<TradeRow[]> {
  const rows = await sql`
    select t.id, t.reference, t.user_id as "userId", u.name, u.email,
           b.name as brand, t.face_value as "faceValue", t.face_currency as "faceCurrency",
           t.payout_type as "payoutType", t.quoted_minor as "quotedMinor", t.status,
           t.risk_score as "riskScore",
           coalesce(t.verification->'signals', '[]'::jsonb) as signals,
           jsonb_array_length(t.image_refs) > 0 as "hasImages",
           t.created_at as "createdAt"
    from giftcards.trades t
    join giftcards.brands b on b.id = t.brand_id
    left join spurs.users u on u.id = t.user_id
    where t.status in ('submitted', 'checking', 'needs_review')
    order by t.risk_score desc, t.created_at asc
    limit 200`;
  return rows as unknown as TradeRow[];
}

export async function pendingReviewCount(): Promise<number> {
  const [row] = await sql`
    select count(*)::int as total
    from giftcards.trades
    where status in ('submitted', 'checking', 'needs_review')`;
  return n(row.total);
}

export async function recentTrades(limit = 100): Promise<TradeRow[]> {
  const rows = await sql`
    select t.id, t.reference, t.user_id as "userId", u.name, u.email,
           b.name as brand, t.face_value as "faceValue", t.face_currency as "faceCurrency",
           t.payout_type as "payoutType",
           case when t.status = 'paid' then t.payout_minor else t.quoted_minor end as "quotedMinor",
           t.status, t.risk_score as "riskScore",
           coalesce(t.verification->'signals', '[]'::jsonb) as signals,
           jsonb_array_length(t.image_refs) > 0 as "hasImages",
           t.created_at as "createdAt"
    from giftcards.trades t
    join giftcards.brands b on b.id = t.brand_id
    left join spurs.users u on u.id = t.user_id
    order by t.created_at desc
    limit ${limit}`;
  return rows as unknown as TradeRow[];
}

export async function rates(): Promise<RateRow[]> {
  const rows = await sql`
    select b.id as "brandId", b.slug, b.name as brand, b.notes, b.active,
           b.auto_verify as "autoVerify", b.requires,
           r.id as "rateId", r.buy_minor_per_unit as "buyMinorPerUnit",
           r.credit_bonus_pct as "creditBonusPct", r.face_currency as "faceCurrency",
           r.min_face as "minFace", r.max_face as "maxFace",
           r.updated_by as "updatedBy", r.created_at as "rateSetAt"
    from giftcards.brands b
    left join lateral (
      select * from giftcards.rates
      where brand_id = b.id and active = true
      order by created_at desc limit 1
    ) r on true
    order by b.sort_order, b.name`;
  return rows as unknown as RateRow[];
}

/** Where credit is actually being spent — the breakage picture. */
export async function breakage(days = 90): Promise<BreakageRow[]> {
  const rows = await sql`
    select app, count(*)::int "spendCount", coalesce(sum(amount_minor::numeric), 0)::text "spentMinor"
    from giftcards.redemptions
    where created_at > now() - (${days} || ' days')::interval
    group by app
    order by sum(amount_minor::numeric) desc`;
  return rows as unknown as BreakageRow[];
}

/** Where credit came from — the other side of the liability. */
export async function creditSources(days = 90): Promise<{ source: string; count: number; totalMinor: string }[]> {
  const rows = await sql`
    select source, count(*)::int count, coalesce(sum(delta::numeric), 0)::text "totalMinor"
    from giftcards.credit_ledger
    where delta::numeric > 0 and created_at > now() - (${days} || ' days')::interval
    group by source
    order by sum(delta::numeric) desc`;
  return rows as unknown as { source: string; count: number; totalMinor: string }[];
}

export async function series(days = 14) {
  const rows = await sql`
    select to_char(d.day, 'YYYY-MM-DD') as date,
           coalesce(sum(o.total_minor::numeric), 0)::text as "soldMinor",
           count(o.id)::int as orders
    from generate_series(current_date - (${days - 1} || ' days')::interval, current_date, '1 day') d(day)
    left join giftcards.orders o
      on o.created_at::date = d.day and o.status in ('paid','fulfilled')
    group by d.day order by d.day`;
  return rows.map((r) => ({ date: String(r.date), soldMinor: String(r.soldMinor), orders: n(r.orders) }));
}

export async function recentOrders(limit = 100) {
  const rows = await sql`
    select o.id, o.reference, o.user_id as "userId", u.name, u.email,
           o.quantity, o.total_minor as "totalMinor", o.status, o.created_at as "createdAt",
           p.name as product
    from giftcards.orders o
    left join spurs.users u on u.id = o.user_id
    left join giftcards.products p on p.id = o.product_id
    order by o.created_at desc
    limit ${limit}`;
  return rows as unknown as {
    id: string; reference: string; userId: string; name: string | null; email: string | null;
    quantity: number; totalMinor: string; status: string; createdAt: string; product: string | null;
  }[];
}

export async function failedJobs(limit = 25) {
  const rows = await sql`
    select id, kind, attempts, last_error as "lastError", finished_at as "finishedAt"
    from giftcards.jobs where status = 'failed'
    order by finished_at desc nulls last limit ${limit}`;
  return rows as unknown as {
    id: string; kind: string; attempts: number; lastError: string | null; finishedAt: string | null;
  }[];
}

/* ---------------------------------------------------------------- actions */

class GiftcardsError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function act<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/api/private/giftcards/admin`, {
    method: "POST",
    headers: { "x-internal-secret": SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new GiftcardsError(json?.error ?? `Gift cards API ${res.status}`, res.status);
  return json as T;
}

export const giftcards = {
  stats, reviewQueue, pendingReviewCount, recentTrades, rates, breakage, creditSources, series, recentOrders, failedJobs,

  approveTrade: (id: string, reviewer: string) =>
    act<{ ok: boolean }>({ action: "trade.approve", id, reviewer }),
  rejectTrade: (id: string, reviewer: string, reason?: string) =>
    act<{ ok: boolean }>({ action: "trade.reject", id, reviewer, reason }),
  /** Reveals the card code for review. Sensitive — always log who asked. */
  revealTrade: (id: string, reviewer: string) =>
    act<{ ok: boolean; code: string | null; images: string[] }>({ action: "trade.reveal", id, reviewer }),

  setRate: (input: {
    brandId: string; buyMinorPerUnit: string; creditBonusPct: number;
    variant?: string; faceCurrency?: string; minFace?: number; maxFace?: number; updatedBy: string;
  }) => act<{ ok: boolean }>({ action: "rate.set", ...input }),

  upsertBrand: (input: {
    slug: string; name: string; notes?: string | null;
    autoVerify?: boolean; active?: boolean; requires?: string; sortOrder?: number;
  }) => act<{ ok: boolean }>({ action: "brand.upsert", ...input }),

  voidCode: (id: string, reason: string) => act<{ ok: boolean }>({ action: "code.void", id, reason }),
  cancelOrder: (id: string, reason: string) => act<{ ok: boolean }>({ action: "order.cancel", id, reason }),
  runJobs: () => act<{ ok: boolean; ran: number; failed: number }>({ action: "jobs.run" }),
};
