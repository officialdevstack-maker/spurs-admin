import "server-only";

/**
 * Paying staff to real bank accounts, through Spurs Pay's first-party payout
 * rail — the same one Wallet withdrawals use. Pay hides whichever processor is
 * behind it, so this app never learns who that is.
 *
 * Idempotent on `reference`: a retried payroll run must not pay anyone twice.
 */

const BASE = (process.env.PAY_INTERNAL_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");

export interface PayoutInput {
  bankCode: string;
  accountNumber: string;
  accountName?: string;
  amountMinor: number;
  reference: string;
  narration?: string;
}

export async function payStaff(input: PayoutInput): Promise<{ reference: string; status: string }> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("Payouts are not configured");
  if (!input.bankCode || !input.accountNumber) throw new Error("No bank account on file");
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Nothing to pay");
  }

  const res = await fetch(`${BASE}/api/private/payouts`, {
    method: "POST",
    headers: { "x-internal-secret": secret, "Content-Type": "application/json" },
    body: JSON.stringify({
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      amount: input.amountMinor,
      currency: "NGN",
      narration: input.narration ?? "Salary",
      reference: input.reference,
    }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Payout failed (${res.status})`);

  return { reference: body?.reference ?? input.reference, status: body?.status ?? "pending" };
}

/** The bank list, for the staff form. Sourced from Pay so codes always match. */
export async function listBanks(): Promise<{ code: string; name: string }[]> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return [];
  try {
    const res = await fetch(`${BASE}/api/private/banks`, {
      headers: { "x-internal-secret": secret },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    return body.banks ?? [];
  } catch {
    return [];
  }
}
