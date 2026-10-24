import "server-only";
import { resolveConfig } from "@/lib/credentials";
import type { WalletSettingType, WalletSettingValue, WalletSettingItem, WalletSettingsCatalog } from "@/lib/wallet-settings";

/**
 * Spurs Suite's platform settings, stored in the admin config registry for app
 * "suite" and served over the config API. Suite reads them from admin, so ops can
 * tune fees, currency and integrations without a redeploy. Secret keys (blank
 * keeps the current value) never round-trip to the client.
 */
interface Def { key: string; group: string; label: string; type: WalletSettingType; default: string; help: string; secret?: boolean }

const DEFAULT_INDUSTRIES = [
  "Retail", "E-commerce", "Food & drink", "Fashion & apparel", "Beauty & cosmetics",
  "Health & wellness", "Professional services", "Technology & software", "Education",
  "Agriculture", "Logistics & delivery", "Real estate", "Hospitality & travel",
  "Media & entertainment", "Finance", "Construction", "Manufacturing", "Nonprofit", "Other",
].join("\n");

export const SUITE_SETTINGS: Def[] = [
  { key: "SUITE_DEFAULT_CURRENCY", group: "General", label: "Default currency", type: "string", default: "NGN", help: "Default currency for new businesses." },
  { key: "SUITE_INDUSTRIES", group: "General", label: "Business industries", type: "text", default: DEFAULT_INDUSTRIES, help: "One per line. Shown as the industry dropdown when a business signs up." },
  { key: "SUITE_INVOICE_FEE_PERCENT", group: "Fees", label: "Invoice fee (%)", type: "string", default: "0", help: "Platform fee taken on paid invoices." },
  { key: "SUITE_PAYROLL_ENABLED", group: "Payroll", label: "Payroll enabled", type: "bool", default: "true", help: "Let businesses run staff payroll." },
  { key: "SUITE_MAX_TEAM", group: "Team", label: "Max team members", type: "int", default: "10", help: "Cap on members per business (0 = unlimited)." },

  { key: "PAY_INTERNAL_URL", group: "Integrations", label: "Spurs Pay internal URL", type: "string", default: "http://127.0.0.1:3100", help: "Where Suite reaches Spurs Pay to mint checkout links." },
  { key: "INTERNAL_API_SECRET", group: "Integrations", label: "Internal API secret", type: "string", default: "", help: "Shared secret for internal Pay/Wallet calls. Blank keeps the current value.", secret: true },
];

export type { WalletSettingsCatalog as SuiteSettingsCatalog };

function cast(raw: string | undefined, type: WalletSettingType, def: string): WalletSettingValue {
  const v = raw ?? def;
  if (type === "bool") return v === "true" || v === "1" || v === "on";
  if (type === "int") return Number(v) || 0;
  return v;
}

export async function suiteSettingsCatalog(): Promise<WalletSettingsCatalog> {
  const cfg = await resolveConfig("suite");
  const out: WalletSettingsCatalog = {};
  for (const d of SUITE_SETTINGS) {
    // Never surface stored secret values to the browser.
    const value = d.secret ? "" : cast(cfg[d.key], d.type, d.default);
    (out[d.group] ??= []).push({
      key: d.key, label: d.label, type: d.type,
      value: value as WalletSettingItem["value"],
      default: cast(undefined, d.type, d.default),
      help: d.help,
    });
  }
  return out;
}

export const SUITE_SETTING_TYPES = Object.fromEntries(SUITE_SETTINGS.map((d) => [d.key, d.type])) as Record<string, WalletSettingType>;
export const SUITE_SECRET_KEYS = new Set(SUITE_SETTINGS.filter((d) => d.secret).map((d) => d.key));
