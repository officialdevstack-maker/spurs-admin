import "server-only";
import { buildSettingsCatalog, type SettingDefinition, type SettingType, type SettingsCatalog } from "@/lib/settings-catalog";

/**
 * Spurs Suite's platform settings, stored in the admin config registry for app
 * "suite" and served over the config API. Suite reads them from admin, so ops can
 * tune fees, currency and integrations without a redeploy. Secret keys (blank
 * keeps the current value) never round-trip to the client.
 */
const DEFAULT_INDUSTRIES = [
  "Retail", "E-commerce", "Food & drink", "Fashion & apparel", "Beauty & cosmetics",
  "Health & wellness", "Professional services", "Technology & software", "Education",
  "Agriculture", "Logistics & delivery", "Real estate", "Hospitality & travel",
  "Media & entertainment", "Finance", "Construction", "Manufacturing", "Nonprofit", "Other",
].join("\n");

export const SUITE_SETTINGS: SettingDefinition[] = [
  { key: "SUITE_DEFAULT_CURRENCY", group: "General", label: "Default currency", type: "string", default: "NGN", help: "Default currency for new businesses." },
  { key: "SUITE_INDUSTRIES", group: "General", label: "Business industries", type: "text", default: DEFAULT_INDUSTRIES, help: "One per line. Shown as the industry dropdown when a business signs up." },
  { key: "SUITE_INVOICE_FEE_PERCENT", group: "Fees", label: "Invoice fee (%)", type: "string", default: "0", help: "Platform fee taken on paid invoices." },
  { key: "SUITE_PAYROLL_ENABLED", group: "Payroll", label: "Payroll enabled", type: "bool", default: "true", help: "Let businesses run staff payroll." },
  { key: "SUITE_MAX_TEAM", group: "Team", label: "Max team members", type: "int", default: "10", help: "Cap on members per business (0 = unlimited)." },

  { key: "PAY_INTERNAL_URL", group: "Integrations", label: "Spurs Pay internal URL", type: "string", default: "http://127.0.0.1:3100", help: "Where Suite reaches Spurs Pay to mint checkout links." },
  { key: "INTERNAL_API_SECRET", group: "Integrations", label: "Internal API secret", type: "string", default: "", help: "Shared secret for internal Pay/Wallet calls. Blank keeps the current value.", secret: true },
];

export type SuiteSettingsCatalog = SettingsCatalog;

export async function suiteSettingsCatalog(): Promise<SuiteSettingsCatalog> {
  return buildSettingsCatalog("suite", SUITE_SETTINGS);
}

export const SUITE_SETTING_TYPES = Object.fromEntries(SUITE_SETTINGS.map((d) => [d.key, d.type])) as Record<string, SettingType>;
export const SUITE_SECRET_KEYS = new Set(SUITE_SETTINGS.filter((d) => d.secret).map((d) => d.key));
