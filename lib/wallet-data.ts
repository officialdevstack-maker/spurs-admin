import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);

const n = (v: unknown) => Number(v ?? 0);

export const ASSET_DECIMALS: Record<string, number> = { NGN: 2, USD: 2, USDT: 6, BTC: 8 };
export const ASSET_SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", USDT: "₮", BTC: "₿" };
export function fmtAsset(minor: string | number, asset: string): string {
  const d = ASSET_DECIMALS[asset] ?? 2;
  const s = String(minor);
  const neg = s.startsWith("-");
  const abs = s.replace("-", "").padStart(d + 1, "0");
  const whole = abs.slice(0, abs.length - d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + (ASSET_SYMBOL[asset] ?? "") + whole + (d ? "." + abs.slice(-d) : "");
}

export interface WalletStats {
  accounts: number;
  holders: number;
  transactions: number;
  ngnBalance: number;
  virtualAccounts: number;
  fundedViaPay: number; // top-ups funded through Pay
}

export async function walletStats(): Promise<WalletStats> {
  const [acc, tx, bal, va, pay] = await Promise.all([
    sql`select count(*)::int c, count(distinct user_id)::int u from wallet.accounts`,
    sql`select count(*)::int c from wallet.transactions`,
    sql`select coalesce(sum(balance),0)::bigint v from wallet.accounts where asset='NGN'`,
    sql`select count(*)::int c from wallet.virtual_accounts`,
    sql`select count(*)::int c from wallet.transactions where source='top_up'`,
  ]);
  return {
    accounts: n(acc[0]?.c),
    holders: n(acc[0]?.u),
    transactions: n(tx[0]?.c),
    ngnBalance: n(bal[0]?.v),
    virtualAccounts: n(va[0]?.c),
    fundedViaPay: n(pay[0]?.c),
  };
}

export async function balanceByAsset(): Promise<{ asset: string; total: number; accounts: number }[]> {
  const rows = await sql`select asset, sum(balance)::bigint total, count(*)::int accounts from wallet.accounts group by asset order by accounts desc`;
  return rows.map((r) => ({ asset: r.asset, total: n(r.total), accounts: n(r.accounts) }));
}

export async function sourceBreakdown(): Promise<{ source: string; count: number }[]> {
  const rows = await sql`select source, count(*)::int c from wallet.transactions group by source order by c desc`;
  return rows.map((r) => ({ source: r.source, count: n(r.c) }));
}

export async function txnSeries(days = 14): Promise<{ date: string; value: number }[]> {
  const rows = await sql`
    select date_trunc('day', created_at) d, count(*)::int c
    from wallet.transactions where created_at >= now() - (${days} || ' days')::interval
    group by 1 order by 1`;
  return rows.map((r) => ({ date: new Date(r.d).toISOString().slice(0, 10), value: n(r.c) }));
}

export interface WalletHolder {
  userId: string;
  name: string | null;
  email: string | null;
  assets: number;
  ngnBalance: number;
  hasVirtualAccount: boolean;
}

export async function listHolders(limit = 500): Promise<WalletHolder[]> {
  const rows = await sql`
    select a.user_id, u.name, u.email,
      count(*)::int assets,
      coalesce(sum(a.balance) filter (where a.asset='NGN'),0)::bigint ngn,
      exists(select 1 from wallet.virtual_accounts v where v.user_id = a.user_id) has_va
    from wallet.accounts a
    left join spurs.users u on u.id = a.user_id
    group by a.user_id, u.name, u.email
    order by ngn desc nulls last
    limit ${limit}`;
  return rows.map((r) => ({
    userId: r.user_id, name: r.name, email: r.email,
    assets: n(r.assets), ngnBalance: n(r.ngn), hasVirtualAccount: r.has_va,
  }));
}

export interface WalletTxn {
  reference: string;
  userId: string;
  userEmail: string | null;
  asset: string;
  direction: string;
  amount: string;
  source: string;
  relatedRef: string | null;
  createdAt: string;
}

export async function listWalletTxns(limit = 500): Promise<WalletTxn[]> {
  const rows = await sql`
    select t.reference, t.user_id, u.email, t.asset, t.direction, t.amount, t.source, t.related_ref, t.created_at
    from wallet.transactions t
    left join spurs.users u on u.id = t.user_id
    order by t.created_at desc limit ${limit}`;
  return rows.map((r) => ({
    reference: r.reference, userId: r.user_id, userEmail: r.email, asset: r.asset,
    direction: r.direction, amount: String(r.amount), source: r.source,
    relatedRef: r.related_ref, createdAt: r.created_at,
  }));
}

/**
 * The cross-service money flow into and out of wallets — the interconnection the
 * admin should surface. Wallets are funded via Pay (top-ups) and bank virtual
 * accounts, held against Accounts users, and spent via payments/sends.
 */
export interface Connections {
  holders: number;          // Accounts users holding a wallet
  fundedViaPay: { count: number; volume: number };   // Pay → Wallet
  bankDeposits: { count: number; volume: number };    // Bank VA → Wallet
  spend: { count: number; volume: number };           // Wallet → Pay/out
  virtualAccounts: number;
}

export async function connections(): Promise<Connections> {
  const [holders, pay, bank, spend, va] = await Promise.all([
    sql`select count(distinct user_id)::int c from wallet.accounts`,
    sql`select count(*)::int c, coalesce(sum(amount),0)::bigint v from wallet.transactions where source='top_up' and (related_ref like 'wtp_%' or related_ref is null)`,
    sql`select count(*)::int c, coalesce(sum(amount),0)::bigint v from wallet.transactions where source='top_up' and related_ref like 'bnk_%'`,
    sql`select count(*)::int c, coalesce(sum(amount),0)::bigint v from wallet.transactions where direction='debit'`,
    sql`select count(*)::int c from wallet.virtual_accounts`,
  ]);
  return {
    holders: n(holders[0]?.c),
    fundedViaPay: { count: n(pay[0]?.c), volume: n(pay[0]?.v) },
    bankDeposits: { count: n(bank[0]?.c), volume: n(bank[0]?.v) },
    spend: { count: n(spend[0]?.c), volume: n(spend[0]?.v) },
    virtualAccounts: n(va[0]?.c),
  };
}
