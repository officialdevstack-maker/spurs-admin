/**
 * Payment provider catalogue for the admin. Each provider has its own set of
 * credentials, a deposit fee, and a webhook the admin generates and pastes into
 * the provider's dashboard. All values live in the admin config registry for
 * app "pay" (namespaced per provider) and are served to Pay from admin.
 */
export interface ProviderField {
  key: string; // suffix; stored as PAY_<PROVIDER>_<key>
  label: string;
  secret: boolean;
  placeholder?: string;
}

export interface ProviderDef {
  id: string;
  label: string;
  note: string;
  fields: ProviderField[];
  sandbox?: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  { id: "sandbox", label: "Sandbox", note: "Simulated — no real money, no credentials", sandbox: true, fields: [] },
  {
    id: "flutterwave", label: "Flutterwave", note: "Cards, transfers, USSD",
    fields: [
      { key: "PUBLIC_KEY", label: "Public key", secret: false, placeholder: "FLWPUBK-…" },
      { key: "SECRET_KEY", label: "Secret key", secret: true, placeholder: "FLWSECK-…" },
      { key: "ENCRYPTION_KEY", label: "Encryption key", secret: true },
    ],
  },
  {
    id: "paymentpoint", label: "PaymentPoint", note: "Virtual accounts",
    fields: [
      { key: "API_KEY", label: "API key", secret: true },
      { key: "API_SECRET", label: "API secret", secret: true },
      { key: "BUSINESS_ID", label: "Business ID", secret: false },
    ],
  },
  {
    id: "moniepoint", label: "Moniepoint", note: "Virtual accounts, transfers",
    fields: [
      { key: "API_KEY", label: "API key", secret: true },
      { key: "CLIENT_SECRET", label: "Client secret", secret: true },
      { key: "CONTRACT_CODE", label: "Contract code", secret: false },
    ],
  },
];

export const credKey = (providerId: string, suffix: string) => `PAY_${providerId.toUpperCase()}_${suffix}`;
export const feePercentKey = (providerId: string) => credKey(providerId, "DEPOSIT_FEE_PERCENT");
export const feeFlatKey = (providerId: string) => credKey(providerId, "DEPOSIT_FEE_FLAT");
export const webhookSecretKey = (providerId: string) => credKey(providerId, "WEBHOOK_SECRET");

export function webhookBase(): string {
  return (process.env.PAY_PUBLIC_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
}
export function buildWebhookUrl(providerId: string, secret: string): string {
  if (!secret) return "";
  return `${webhookBase()}/api/webhooks/provider?provider=${providerId}&token=${secret}`;
}

export interface ProviderState {
  id: string;
  label: string;
  note: string;
  sandbox: boolean;
  fields: ProviderField[];
  values: Record<string, string>; // field.key -> current value
  feePercent: string;
  feeFlat: string;
  webhookUrl: string;
  hasWebhook: boolean;
}

/** Build per-provider current state from the resolved pay config. */
export function providerStates(cfg: Record<string, string>): ProviderState[] {
  return PROVIDERS.map((p) => {
    const values: Record<string, string> = {};
    for (const f of p.fields) values[f.key] = cfg[credKey(p.id, f.key)] ?? "";
    const secret = cfg[webhookSecretKey(p.id)] ?? "";
    return {
      id: p.id, label: p.label, note: p.note, sandbox: !!p.sandbox, fields: p.fields,
      values,
      feePercent: cfg[feePercentKey(p.id)] ?? "",
      feeFlat: cfg[feeFlatKey(p.id)] ?? "",
      webhookUrl: buildWebhookUrl(p.id, secret),
      hasWebhook: !!secret,
    };
  });
}
