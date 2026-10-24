import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATA_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL!);

export interface CommandSearchResult {
  id: string;
  label: string;
  description: string;
  href: string;
  kind: "customer" | "payment" | "merchant";
}

export async function searchCommandEntities(
  query: string,
  access: { customers: boolean; money: boolean },
): Promise<CommandSearchResult[]> {
  const term = query.trim();
  if (term.length < 2 || term.length > 100) return [];

  const [customers, payments, merchants] = await Promise.all([
    access.customers
      ? sql`
          select id, name, email
          from spurs.users
          where id = ${term}
             or position(lower(${term}) in lower(coalesce(name, ''))) > 0
             or position(lower(${term}) in lower(coalesce(email, ''))) > 0
          order by created_at desc
          limit 5`
      : Promise.resolve([] as Array<{ id: string; name: string | null; email: string | null }>),
    access.money
      ? sql`
          select reference, status, amount, currency, customer_email
          from pay.payments
          where position(lower(${term}) in lower(reference)) > 0
             or position(lower(${term}) in lower(coalesce(customer_email, ''))) > 0
          order by created_at desc
          limit 5`
      : Promise.resolve([] as Array<{
          reference: string; status: string; amount: number; currency: string; customer_email: string | null;
        }>),
    access.money
      ? sql`
          select id, business_name, email
          from pay.merchants
          where id = ${term}
             or position(lower(${term}) in lower(coalesce(business_name, ''))) > 0
             or position(lower(${term}) in lower(coalesce(email, ''))) > 0
          order by created_at desc
          limit 5`
      : Promise.resolve([] as Array<{ id: string; business_name: string | null; email: string | null }>),
  ]);

  return [
    ...customers.map((customer) => ({
      id: customer.id,
      label: customer.name ?? customer.email ?? customer.id,
      description: customer.email ?? `Customer ID ${customer.id}`,
      href: `/users/${encodeURIComponent(customer.id)}`,
      kind: "customer" as const,
    })),
    ...payments.map((payment) => ({
      id: payment.reference,
      label: payment.reference,
      description: `${payment.status} · ${payment.currency} ${payment.amount}${payment.customer_email ? ` · ${payment.customer_email}` : ""}`,
      href: `/payments?search=${encodeURIComponent(payment.reference)}`,
      kind: "payment" as const,
    })),
    ...merchants.map((merchant) => ({
      id: merchant.id,
      label: merchant.business_name ?? merchant.email ?? merchant.id,
      description: merchant.email ?? `Merchant ID ${merchant.id}`,
      href: `/services/pay/merchants/${encodeURIComponent(merchant.id)}`,
      kind: "merchant" as const,
    })),
  ];
}
