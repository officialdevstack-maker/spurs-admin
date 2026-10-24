import "server-only";
import { resolveConfig } from "@/lib/credentials";

/**
 * Pay's platform settings. Stored in the admin config registry for app "pay"
 * (the same source of truth as the processor choice) and served to Pay via the
 * config API — so they take effect once Pay reads its config from admin.
 */
export type PaySettingType = "bool" | "int" | "string" | "text" | "methods";

export const PAYMENT_METHOD_OPTIONS = [
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "ussd", label: "USSD" },
  { value: "wallet", label: "Wallet" },
];

interface Def {
  key: string;
  group: string;
  label: string;
  type: PaySettingType;
  default: string;
  help: string;
}

export const PAY_SETTINGS: Def[] = [
  { key: "PAY_DEFAULT_CURRENCY", group: "Payments", label: "Default currency", type: "string", default: "NGN", help: "Currency used when a charge doesn't specify one." },
  { key: "PAY_ALLOWED_METHODS", group: "Payments", label: "Enabled methods", type: "methods", default: "card,bank_transfer,ussd,wallet", help: "Payment methods offered at checkout by default." },
  { key: "PAY_CHECKOUT_TITLE", group: "Payments", label: "Checkout title", type: "string", default: "Spurs Pay", help: "Heading shown on the hosted checkout page." },

  { key: "PAY_PAYOUTS_ENABLED", group: "Payouts", label: "Payouts enabled", type: "bool", default: "true", help: "Allow merchants to send payouts." },
  { key: "PAY_MIN_PAYOUT", group: "Payouts", label: "Minimum payout (₦)", type: "int", default: "100", help: "Smallest payout a merchant can request." },
  { key: "PAY_PAYOUT_DAILY_LIMIT", group: "Payouts", label: "Daily payout limit (₦)", type: "int", default: "5000000", help: "Per-merchant cap on payouts each day." },

  { key: "PAY_FEE_PERCENT", group: "Fees", label: "Transaction fee (%)", type: "string", default: "1.5", help: "Percentage fee applied to each successful charge." },
  { key: "PAY_FEE_CAP", group: "Fees", label: "Fee cap (₦)", type: "int", default: "2000", help: "Maximum fee charged on a single transaction." },

  { key: "PAY_PAYMENT_PREFIX", group: "Reference format", label: "Payment prefix", type: "string", default: "spy_", help: "Default prefix for payment references (merchants can override)." },
  { key: "PAY_PAYMENT_SUFFIX", group: "Reference format", label: "Payment suffix", type: "string", default: "", help: "Default suffix appended to payment references." },
  { key: "PAY_INVOICE_PREFIX", group: "Reference format", label: "Invoice prefix", type: "string", default: "INV-", help: "Default prefix for invoice numbers." },
  { key: "PAY_INVOICE_SUFFIX", group: "Reference format", label: "Invoice suffix", type: "string", default: "", help: "Default suffix appended to invoice numbers." },
  { key: "PAY_TRANSACTION_PREFIX", group: "Reference format", label: "Transaction prefix", type: "string", default: "spo_", help: "Default prefix for payout/transaction references." },
  { key: "PAY_TRANSACTION_SUFFIX", group: "Reference format", label: "Transaction suffix", type: "string", default: "", help: "Default suffix appended to payout/transaction references." },

  { key: "PAY_WEBHOOK_RETRIES", group: "Webhooks", label: "Delivery retries", type: "int", default: "5", help: "How many times to retry a failed webhook." },
  { key: "PAY_WEBHOOK_TIMEOUT", group: "Webhooks", label: "Delivery timeout (s)", type: "int", default: "10", help: "Seconds to wait for a merchant's webhook endpoint." },

  { key: "PAY_FLAG_ABOVE", group: "Risk", label: "Flag payments above (₦)", type: "int", default: "1000000", help: "Charges at or above this amount are flagged for review." },
  { key: "PAY_REQUIRE_3DS", group: "Risk", label: "Require 3-D Secure", type: "bool", default: "false", help: "Force 3-D Secure authentication on card payments." },
];

export type PaySettingValue = boolean | number | string;
export interface PaySettingItem {
  key: string; label: string; type: PaySettingType;
  value: PaySettingValue; default: PaySettingValue; help: string;
}
export type PaySettingsCatalog = Record<string, PaySettingItem[]>;

function cast(raw: string | undefined, type: PaySettingType, def: string): PaySettingValue {
  const v = raw ?? def;
  if (type === "bool") return v === "true" || v === "1" || v === "on";
  if (type === "int") return Number(v) || 0;
  return v; // string | text | methods (comma-separated)
}

/** Read current Pay settings from the admin config store, grouped for the UI. */
export async function paySettingsCatalog(): Promise<PaySettingsCatalog> {
  const cfg = await resolveConfig("pay");
  const out: PaySettingsCatalog = {};
  for (const d of PAY_SETTINGS) {
    (out[d.group] ??= []).push({
      key: d.key, label: d.label, type: d.type,
      value: cast(cfg[d.key], d.type, d.default),
      default: cast(undefined, d.type, d.default),
      help: d.help,
    });
  }
  return out;
}

export const PAY_SETTING_TYPES = Object.fromEntries(PAY_SETTINGS.map((d) => [d.key, d.type])) as Record<string, PaySettingType>;
