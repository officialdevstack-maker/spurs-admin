import { neon } from "@neondatabase/serverless";

// Reuse the read-only connection into the shared platform DB (pay schema lives
// on Neon, so the admin reads it directly — no per-app API needed).
const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);

const n = (v: unknown) => Number(v ?? 0);

export interface PayStats {
  merchants: number;
  payments: number;
  successful: number;
  failed: number;
  collected: number; // successful volume, kobo (all modes)
  liveCollected: number;
  refunded: number;
  payouts: number;
  paidOut: number;
  virtualAccounts: number;
  invoices: number;
  live: { count: number; volume: number };
  test: { count: number; volume: number };
}

export async function payStats(): Promise<PayStats> {
  const [m, p, payouts, refunds, va, inv, modes] = await Promise.all([
    sql`select count(*)::int c from pay.merchants`,
    sql`select count(*)::int c,
          count(*) filter (where status='successful')::int ok,
          count(*) filter (where status='failed')::int failed,
          coalesce(sum(amount) filter (where status='successful'),0)::bigint v,
          coalesce(sum(amount) filter (where status='successful' and mode='live'),0)::bigint lv
        from pay.payments`,
    sql`select count(*)::int c, coalesce(sum(amount) filter (where status='successful'),0)::bigint v from pay.payouts`,
    sql`select coalesce(sum(amount),0)::bigint v from pay.refunds`,
    sql`select count(*)::int c from pay.virtual_accounts`,
    sql`select count(*)::int c from pay.invoices`,
    sql`select mode, count(*)::int c, coalesce(sum(amount) filter (where status='successful'),0)::bigint v from pay.payments group by mode`,
  ]);
  const row = (mode: string) => modes.find((r) => r.mode === mode);
  return {
    merchants: n(m[0]?.c),
    payments: n(p[0]?.c),
    successful: n(p[0]?.ok),
    failed: n(p[0]?.failed),
    collected: n(p[0]?.v),
    liveCollected: n(p[0]?.lv),
    refunded: n(refunds[0]?.v),
    payouts: n(payouts[0]?.c),
    paidOut: n(payouts[0]?.v),
    virtualAccounts: n(va[0]?.c),
    invoices: n(inv[0]?.c),
    live: { count: n(row("live")?.c), volume: n(row("live")?.v) },
    test: { count: n(row("test")?.c), volume: n(row("test")?.v) },
  };
}

/** Daily successful payment volume (major units) over N days. */
export async function payVolumeSeries(days = 14): Promise<{ date: string; value: number }[]> {
  const rows = await sql`
    select date_trunc('day', coalesce(paid_at, created_at)) d, sum(amount)::bigint v
    from pay.payments
    where status='successful' and coalesce(paid_at, created_at) >= now() - (${days} || ' days')::interval
    group by 1 order by 1`;
  return rows.map((r) => ({ date: new Date(r.d).toISOString().slice(0, 10), value: n(r.v) / 100 }));
}

export async function statusBreakdown(): Promise<{ status: string; count: number }[]> {
  const rows = await sql`select status, count(*)::int c from pay.payments group by status order by c desc`;
  return rows.map((r) => ({ status: r.status, count: n(r.c) }));
}

export async function methodBreakdown(): Promise<{ method: string; count: number }[]> {
  const rows = await sql`
    select coalesce(method,'unknown') method, count(*)::int c
    from pay.payments where status='successful' group by method order by c desc limit 6`;
  return rows.map((r) => ({ method: r.method, count: n(r.c) }));
}

export interface MerchantRow {
  id: string;
  business: string | null;
  email: string | null;
  payments: number;
  collected: number;
  payouts: number;
  createdAt: string;
}

export async function listMerchants(limit = 500): Promise<MerchantRow[]> {
  const rows = await sql`
    select m.id, m.business_name business, m.email, m.created_at,
      (select count(*)::int from pay.payments p where p.merchant_id = m.id) payments,
      (select coalesce(sum(amount),0)::bigint from pay.payments p where p.merchant_id = m.id and p.status='successful') collected,
      (select count(*)::int from pay.payouts po where po.merchant_id = m.id) payouts
    from pay.merchants m
    order by collected desc nulls last
    limit ${limit}`;
  return rows.map((r) => ({
    id: r.id, business: r.business, email: r.email,
    payments: n(r.payments), collected: n(r.collected), payouts: n(r.payouts),
    createdAt: r.created_at,
  }));
}

export async function topMerchants(limit = 5): Promise<{ business: string; collected: number }[]> {
  const rows = await sql`
    select coalesce(m.business_name,'—') business, coalesce(sum(p.amount) filter (where p.status='successful'),0)::bigint v
    from pay.merchants m left join pay.payments p on p.merchant_id = m.id
    group by m.id, m.business_name order by v desc limit ${limit}`;
  return rows.map((r) => ({ business: r.business, collected: n(r.v) }));
}

export interface PayoutRow {
  reference: string;
  merchant: string | null;
  recipient: string | null;
  bank: string | null;
  amount: number;
  currency: string;
  status: string;
  mode: string;
  createdAt: string;
}

export async function listPayouts(limit = 500): Promise<PayoutRow[]> {
  const rows = await sql`
    select po.reference, m.business_name merchant, r.name recipient, r.bank_name bank,
           po.amount, po.currency, po.status, po.mode, po.created_at
    from pay.payouts po
    left join pay.merchants m on m.id = po.merchant_id
    left join pay.recipients r on r.id = po.recipient_id
    order by po.created_at desc limit ${limit}`;
  return rows.map((r) => ({
    reference: r.reference, merchant: r.merchant, recipient: r.recipient, bank: r.bank,
    amount: n(r.amount), currency: r.currency, status: r.status, mode: r.mode, createdAt: r.created_at,
  }));
}

export interface MerchantDetail {
  id: string;
  business: string | null;
  email: string | null;
  webhookUrl: string | null;
  createdAt: string;
  stats: { payments: number; collected: number; payouts: number; paidOut: number; refunded: number; apiKeys: number; virtualAccounts: number };
  recentPayments: { reference: string; amount: number; currency: string; status: string; mode: string; customerEmail: string | null; createdAt: string }[];
  recentPayouts: { reference: string; amount: number; currency: string; status: string; recipient: string | null; createdAt: string }[];
}

export async function getMerchant(id: string): Promise<MerchantDetail | null> {
  const [m] = await sql`select id, business_name, email, webhook_url, created_at from pay.merchants where id = ${id}`;
  if (!m) return null;
  const [agg, keys, va, payments, payouts] = await Promise.all([
    sql`select
          (select count(*)::int from pay.payments where merchant_id=${id}) payments,
          (select coalesce(sum(amount),0)::bigint from pay.payments where merchant_id=${id} and status='successful') collected,
          (select count(*)::int from pay.payouts where merchant_id=${id}) payouts,
          (select coalesce(sum(amount),0)::bigint from pay.payouts where merchant_id=${id} and status='successful') paid_out,
          (select coalesce(sum(amount),0)::bigint from pay.refunds where merchant_id=${id}) refunded`,
    sql`select count(*)::int c from pay.api_keys where merchant_id=${id} and revoked=false`,
    sql`select count(*)::int c from pay.virtual_accounts where merchant_id=${id}`,
    sql`select reference, amount, currency, status, mode, customer_email, created_at from pay.payments where merchant_id=${id} order by created_at desc limit 8`,
    sql`select po.reference, po.amount, po.currency, po.status, r.name recipient, po.created_at from pay.payouts po left join pay.recipients r on r.id=po.recipient_id where po.merchant_id=${id} order by po.created_at desc limit 8`,
  ]);
  return {
    id: m.id, business: m.business_name, email: m.email, webhookUrl: m.webhook_url, createdAt: m.created_at,
    stats: {
      payments: n(agg[0]?.payments), collected: n(agg[0]?.collected), payouts: n(agg[0]?.payouts),
      paidOut: n(agg[0]?.paid_out), refunded: n(agg[0]?.refunded), apiKeys: n(keys[0]?.c), virtualAccounts: n(va[0]?.c),
    },
    recentPayments: payments.map((r) => ({
      reference: r.reference, amount: n(r.amount), currency: r.currency, status: r.status,
      mode: r.mode, customerEmail: r.customer_email, createdAt: r.created_at,
    })),
    recentPayouts: payouts.map((r) => ({
      reference: r.reference, amount: n(r.amount), currency: r.currency, status: r.status,
      recipient: r.recipient, createdAt: r.created_at,
    })),
  };
}
