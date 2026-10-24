import "server-only";
import { neon } from "@neondatabase/serverless";

// Admin reads the shared Neon directly (it can see every app's schema), so the
// Suite console needs no separate API — it queries the `suite` schema here.
const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);
const n = (v: unknown) => Number(v ?? 0);

export interface SuiteStats {
  businesses: number;
  invoices: number;
  paidInvoices: number;
  revenueMinor: number;      // successful payments across all businesses
  outstandingMinor: number;  // sent + overdue invoices
  payments: number;
  employees: number;
  payRuns: number;
}

const ZERO: SuiteStats = { businesses: 0, invoices: 0, paidInvoices: 0, revenueMinor: 0, outstandingMinor: 0, payments: 0, employees: 0, payRuns: 0 };

export async function suiteStats(): Promise<SuiteStats> {
  try {
    const [biz, inv, paid, rev, out, pay, emp, runs] = await Promise.all([
      sql`select count(*)::int c from suite.businesses`,
      sql`select count(*)::int c from suite.invoices`,
      sql`select count(*)::int c from suite.invoices where status = 'paid'`,
      sql`select coalesce(sum(amount_minor), 0)::bigint v from suite.payments where status = 'successful'`,
      sql`select coalesce(sum(amount_minor), 0)::bigint v from suite.invoices where status in ('sent', 'overdue')`,
      sql`select count(*)::int c from suite.payments`,
      sql`select count(*)::int c from suite.employees`,
      sql`select count(*)::int c from suite.pay_runs where status = 'paid'`,
    ]);
    return {
      businesses: n(biz[0]?.c), invoices: n(inv[0]?.c), paidInvoices: n(paid[0]?.c),
      revenueMinor: n(rev[0]?.v), outstandingMinor: n(out[0]?.v),
      payments: n(pay[0]?.c), employees: n(emp[0]?.c), payRuns: n(runs[0]?.c),
    };
  } catch {
    return ZERO; // suite schema not deployed yet — render an empty console
  }
}

export interface SuiteBusinessRow {
  id: string; name: string; currency: string; ownerId: string; createdAt: string;
  invoices: number; revenueMinor: number;
}

export async function recentBusinesses(limit = 12): Promise<SuiteBusinessRow[]> {
  try {
    const rows = await sql`
      select b.id, b.name, b.currency, b.owner_id as "ownerId", b.created_at as "createdAt",
        (select count(*)::int from suite.invoices i where i.business_id = b.id) as invoices,
        (select coalesce(sum(p.amount_minor), 0)::bigint from suite.payments p where p.business_id = b.id and p.status = 'successful') as "revenueMinor"
      from suite.businesses b
      order by b.created_at desc
      limit ${limit}`;
    return rows.map((r) => ({ ...(r as SuiteBusinessRow), invoices: n(r.invoices), revenueMinor: n(r.revenueMinor) }));
  } catch {
    return [];
  }
}
