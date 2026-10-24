import "server-only";
import { SpursPayInternal } from "@spurs-cloud/pay";

/** Verify Spurs Pay payments (subscriptions are paid via Pay's hosted checkout). */
const client = () =>
  new SpursPayInternal({
    baseUrl: process.env.PAY_INTERNAL_URL,
    internalSecret: process.env.INTERNAL_API_SECRET,
  });

export interface PayPayment {
  reference: string;
  amount: number;
  currency: string;
  status: "pending" | "successful" | "failed";
  metadata: Record<string, unknown>;
  paidAt: string | null;
}

export async function getPayment(reference: string): Promise<PayPayment | null> {
  return (await client().getPayment(reference)) as unknown as PayPayment | null;
}
