import { neon } from "@neondatabase/serverless";

// A read-only connection into the shared platform database (pay / wallet / baas
// / spurs schemas). Admin sees everything, unobscured — nothing is filtered.
const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);

export interface PlatformStats {
  users: number;
  wallets: number;
  merchants: number;
  projects: number;
  paymentsCount: number;
  successful: number;
  failed: number;
  collected: number; // successful payment volume, kobo
  refunded: number;
  payoutsCount: number;
  paidOut: number; // successful payout volume, kobo
  walletNgn: number; // sum of NGN wallet balances, kobo
  txnsCount: number;
  live: { count: number; volume: number };
  test: { count: number; volume: number };
}

const n = (v: unknown) => Number(v ?? 0);

export async function platformStats(): Promise<PlatformStats> {
  const [users, wallets, merchants, projects, pay, payouts, walletBal, txns, modes] = await Promise.all([
    sql`select count(*)::int c from spurs.users`,
    sql`select count(*)::int c from wallet.accounts`,
    sql`select count(*)::int c from pay.merchants`,
    sql`select count(*)::int c from spurs.projects`,
    sql`select
          count(*)::int c,
          count(*) filter (where status='successful')::int ok,
          count(*) filter (where status='failed')::int failed,
          coalesce(sum(amount) filter (where status='successful'),0)::bigint v,
          coalesce(sum(refunded_amount),0)::bigint r
        from pay.payments`,
    sql`select count(*)::int c, coalesce(sum(amount) filter (where status='successful'),0)::bigint v from pay.payouts`,
    sql`select coalesce(sum(balance),0)::bigint v from wallet.accounts where asset='NGN'`,
    sql`select count(*)::int c from wallet.transactions`,
    sql`select mode, count(*)::int c, coalesce(sum(amount) filter (where status='successful'),0)::bigint v from pay.payments group by mode`,
  ]);
  const modeRow = (m: string) => modes.find((r) => r.mode === m);
  return {
    users: n(users[0]?.c),
    wallets: n(wallets[0]?.c),
    merchants: n(merchants[0]?.c),
    projects: n(projects[0]?.c),
    paymentsCount: n(pay[0]?.c),
    successful: n(pay[0]?.ok),
    failed: n(pay[0]?.failed),
    collected: n(pay[0]?.v),
    refunded: n(pay[0]?.r),
    payoutsCount: n(payouts[0]?.c),
    paidOut: n(payouts[0]?.v),
    walletNgn: n(walletBal[0]?.v),
    txnsCount: n(txns[0]?.c),
    live: { count: n(modeRow("live")?.c), volume: n(modeRow("live")?.v) },
    test: { count: n(modeRow("test")?.c), volume: n(modeRow("test")?.v) },
  };
}

/** Daily successful payment volume (major units) over the last N days. */
export async function paymentSeries(days = 30): Promise<{ t: number; v: number }[]> {
  const rows = await sql`
    select date_trunc('day', coalesce(paid_at, created_at)) d, sum(amount)::bigint v
    from pay.payments
    where status='successful' and coalesce(paid_at, created_at) >= now() - (${days} || ' days')::interval
    group by 1 order by 1`;
  return rows.map((r) => ({ t: new Date(r.d).getTime(), v: n(r.v) / 100 }));
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  hasWallet: boolean;
  isMerchant: boolean;
  projects: number;
}

export async function listUsers(limit = 100): Promise<UserRow[]> {
  const rows = await sql`
    select u.id, u.name, u.email,
      exists(select 1 from wallet.accounts w where w.user_id = u.id) has_wallet,
      exists(select 1 from pay.merchants m where m.id = u.id) is_merchant,
      (select count(*)::int from spurs.projects p where p.owner_id = u.id) projects
    from spurs.users u
    order by u.created_at desc nulls last
    limit ${limit}`;
  return rows.map((r) => ({
    id: r.id, name: r.name, email: r.email,
    hasWallet: r.has_wallet, isMerchant: r.is_merchant, projects: n(r.projects),
  }));
}

export interface UserDetail {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string | null;
  wallets: { asset: string; balance: string; createdAt: string }[];
  virtualAccount: { bankName: string; accountNumber: string; accountName: string; currency: string } | null;
  merchant: { businessName: string; email: string | null; webhookUrl: string | null; createdAt: string } | null;
  projects: { id: string; name: string; slug: string; region: string; createdAt: string }[];
  transactions: TxnRow[];
  payments: PaymentRow[];
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const [u] = await sql`select id, name, email, created_at from spurs.users where id = ${id}`;
  if (!u) return null;
  const [wallets, va, merchant, projects, txns, payments] = await Promise.all([
    sql`select asset, balance, created_at from wallet.accounts where user_id = ${id} order by asset`,
    sql`select bank_name, account_number, account_name, currency from wallet.virtual_accounts where user_id = ${id} limit 1`,
    sql`select business_name, email, webhook_url, created_at from pay.merchants where id = ${id} limit 1`,
    sql`select id, name, slug, region, created_at from spurs.projects where owner_id = ${id} order by created_at desc`,
    sql`select reference, user_id, asset, direction, amount, source, created_at
        from wallet.transactions where user_id = ${id} order by created_at desc limit 12`,
    u.email
      ? sql`select p.reference, p.mode, p.amount, p.currency, p.status, p.method, p.customer_email,
             m.business_name business, p.created_at
             from pay.payments p left join pay.merchants m on m.id = p.merchant_id
             where p.customer_email = ${u.email} order by p.created_at desc limit 12`
      : Promise.resolve([] as Array<Record<string, string>>),
  ]);
  return {
    id: u.id, name: u.name, email: u.email, createdAt: u.created_at,
    wallets: wallets.map((w) => ({ asset: w.asset, balance: String(w.balance), createdAt: w.created_at })),
    virtualAccount: va[0]
      ? { bankName: va[0].bank_name, accountNumber: va[0].account_number, accountName: va[0].account_name, currency: va[0].currency }
      : null,
    merchant: merchant[0]
      ? { businessName: merchant[0].business_name, email: merchant[0].email, webhookUrl: merchant[0].webhook_url, createdAt: merchant[0].created_at }
      : null,
    projects: projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, region: p.region, createdAt: p.created_at })),
    transactions: txns.map((r) => ({
      reference: r.reference, userId: r.user_id, userEmail: u.email, asset: r.asset,
      direction: r.direction, amount: String(r.amount), source: r.source, createdAt: r.created_at,
    })),
    payments: payments.map((r) => ({
      reference: r.reference, mode: r.mode, amount: n(r.amount), currency: r.currency,
      status: r.status, method: r.method, customerEmail: r.customer_email,
      business: r.business, createdAt: r.created_at,
    })),
  };
}

export interface PaymentRow {
  reference: string;
  mode: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  customerEmail: string | null;
  business: string | null;
  createdAt: string;
}

export async function listPayments(limit = 100): Promise<PaymentRow[]> {
  const rows = await sql`
    select p.reference, p.mode, p.amount, p.currency, p.status, p.method,
           p.customer_email, m.business_name business, p.created_at
    from pay.payments p
    left join pay.merchants m on m.id = p.merchant_id
    order by p.created_at desc
    limit ${limit}`;
  return rows.map((r) => ({
    reference: r.reference, mode: r.mode, amount: n(r.amount), currency: r.currency,
    status: r.status, method: r.method, customerEmail: r.customer_email,
    business: r.business, createdAt: r.created_at,
  }));
}

export interface TxnRow {
  reference: string;
  userId: string;
  userEmail: string | null;
  asset: string;
  direction: string;
  amount: string;
  source: string;
  createdAt: string;
}

export async function listTransactions(limit = 100): Promise<TxnRow[]> {
  const rows = await sql`
    select t.reference, t.user_id, u.email user_email, t.asset, t.direction,
           t.amount, t.source, t.created_at
    from wallet.transactions t
    left join spurs.users u on u.id = t.user_id
    order by t.created_at desc
    limit ${limit}`;
  return rows.map((r) => ({
    reference: r.reference, userId: r.user_id, userEmail: r.user_email, asset: r.asset,
    direction: r.direction, amount: String(r.amount), source: r.source, createdAt: r.created_at,
  }));
}
