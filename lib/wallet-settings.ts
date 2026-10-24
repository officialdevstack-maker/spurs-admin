import "server-only";
import { resolveConfig } from "@/lib/credentials";

/**
 * Wallet's platform settings. Stored in the admin config registry for app
 * "wallet" and served over the config API — they take effect once Wallet reads
 * its config from admin.
 */
export type WalletSettingType = "bool" | "int" | "string" | "text" | "assets";

interface Def {
  key: string;
  group: string;
  label: string;
  type: WalletSettingType;
  default: string;
  help: string;
}

export const WALLET_ASSET_OPTIONS = [
  { value: "NGN", label: "Naira (NGN)" },
  { value: "USD", label: "Dollar (USD)" },
  { value: "USDT", label: "Tether (USDT)" },
  { value: "BTC", label: "Bitcoin (BTC)" },
];

export const WALLET_SETTINGS: Def[] = [
  { key: "WALLET_ENABLED_ASSETS", group: "Assets", label: "Enabled assets", type: "assets", default: "NGN,USD,USDT,BTC", help: "Currencies users can hold in their wallet." },
  { key: "WALLET_BASE_CURRENCY", group: "Assets", label: "Base currency", type: "string", default: "NGN", help: "Currency used for reporting and balances." },

  { key: "WALLET_TOPUP_ENABLED", group: "Funding", label: "Top-ups enabled", type: "bool", default: "true", help: "Allow users to fund their wallet via Pay." },
  { key: "WALLET_MIN_TOPUP", group: "Funding", label: "Minimum top-up (₦)", type: "int", default: "100", help: "Smallest wallet top-up allowed." },
  { key: "WALLET_VA_ENABLED", group: "Funding", label: "Virtual accounts", type: "bool", default: "true", help: "Issue dedicated bank accounts that credit the wallet." },

  { key: "WALLET_SEND_ENABLED", group: "Transfers", label: "Wallet-to-wallet sends", type: "bool", default: "true", help: "Allow users to send funds to other Spurs users." },
  { key: "WALLET_CONVERT_ENABLED", group: "Transfers", label: "Asset conversion", type: "bool", default: "true", help: "Allow converting between held assets." },
  { key: "WALLET_DAILY_SEND_LIMIT", group: "Transfers", label: "Daily send limit (₦)", type: "int", default: "5000000", help: "Per-user cap on sends each day." },

  { key: "WALLET_CONVERT_FEE_PERCENT", group: "Fees", label: "Conversion fee (%)", type: "string", default: "0.5", help: "Fee applied when converting between assets." },
  { key: "WALLET_SEND_FEE_FLAT", group: "Fees", label: "Send fee (₦)", type: "int", default: "0", help: "Flat fee per wallet-to-wallet send." },

  { key: "WALLET_KYC_REQUIRED", group: "Compliance", label: "Require KYC", type: "bool", default: "false", help: "Require identity verification before funding or sending." },

  { key: "WALLET_FIRST_DEPOSIT_BONUS_ENABLED", group: "Bonuses", label: "First-deposit bonus", type: "bool", default: "false", help: "Credit a one-time bonus the first time a user funds their wallet (base currency only)." },
  { key: "WALLET_FIRST_DEPOSIT_BONUS", group: "Bonuses", label: "Bonus amount (₦)", type: "int", default: "0", help: "Naira credited on the user's first qualifying deposit." },
  { key: "WALLET_FIRST_DEPOSIT_BONUS_MIN", group: "Bonuses", label: "Minimum qualifying deposit (₦)", type: "int", default: "0", help: "The first deposit must be at least this much to earn the bonus." },

  // Crypto custody provider — all credentials live here, served to Wallet from admin.
  { key: "CRYPTO_PROVIDER", group: "Crypto custody", label: "Custody provider", type: "string", default: "sandbox", help: "sandbox | tatum (hosted) | selfhosted (your keys + your node)." },
  { key: "SELF_MNEMONIC", group: "Crypto custody", label: "Self-host seed (BIP-39)", type: "text", default: "", help: "Self-hosted only: mnemonic that derives all deposit + hot wallets. Keep secret." },
  { key: "SELF_RPC_ETHEREUM", group: "Crypto custody", label: "Self-host ETH RPC URL", type: "string", default: "", help: "Self-hosted only: your own Ethereum node's JSON-RPC endpoint." },
  { key: "SELF_HOT_PATH", group: "Crypto custody", label: "Self-host hot wallet path", type: "string", default: "m/44'/60'/0'/0/0", help: "HD path of the pooled hot wallet that signs withdrawals." },
  { key: "SELF_USDT_CONTRACT_ETHEREUM", group: "Crypto custody", label: "USDT contract (ETH)", type: "string", default: "", help: "Override the USDT contract (e.g. a testnet token). Blank = mainnet." },
  { key: "SELF_CONFIRMATIONS", group: "Crypto custody", label: "Required confirmations", type: "int", default: "12", help: "Confirmations before a deposit credits the ledger." },
  { key: "SELF_SWEEP", group: "Crypto custody", label: "Auto-sweep to hot wallet", type: "bool", default: "false", help: "Move confirmed deposits into the pooled hot wallet (validate on testnet first)." },
  { key: "TATUM_API_KEY", group: "Crypto custody", label: "Tatum API key", type: "string", default: "", help: "Tatum.io API key for hosted custody." },
  { key: "TATUM_XPUB_BITCOIN", group: "Crypto custody", label: "BTC xpub", type: "string", default: "", help: "Extended public key deposits are derived from." },
  { key: "TATUM_XPUB_ETHEREUM", group: "Crypto custody", label: "ETH xpub", type: "string", default: "", help: "Used for ETH and ERC-20 (USDT) deposit addresses." },
  { key: "TATUM_XPUB_TRON", group: "Crypto custody", label: "TRON xpub", type: "string", default: "", help: "Used for TRC-20 (USDT) deposit addresses." },
  { key: "TATUM_SIGNATURE_ID", group: "Crypto custody", label: "KMS signature id", type: "string", default: "", help: "Tatum KMS signature id used to sign withdrawals." },
  { key: "SPURS_CRYPTO_WEBHOOK_URL", group: "Crypto custody", label: "Deposit webhook URL", type: "string", default: "", help: "Public URL the provider calls on inbound deposits." },
  { key: "SPURS_CRYPTO_WEBHOOK_TOKEN", group: "Crypto custody", label: "Webhook token", type: "string", default: "", help: "Secret token appended to the webhook URL." },
];

export type WalletSettingValue = boolean | number | string;
export interface WalletSettingItem {
  key: string; label: string; type: WalletSettingType;
  value: WalletSettingValue; default: WalletSettingValue; help: string;
}
export type WalletSettingsCatalog = Record<string, WalletSettingItem[]>;

function cast(raw: string | undefined, type: WalletSettingType, def: string): WalletSettingValue {
  const v = raw ?? def;
  if (type === "bool") return v === "true" || v === "1" || v === "on";
  if (type === "int") return Number(v) || 0;
  return v; // string | text | assets (comma-separated)
}

export async function walletSettingsCatalog(): Promise<WalletSettingsCatalog> {
  const cfg = await resolveConfig("wallet");
  const out: WalletSettingsCatalog = {};
  for (const d of WALLET_SETTINGS) {
    (out[d.group] ??= []).push({
      key: d.key, label: d.label, type: d.type,
      value: cast(cfg[d.key], d.type, d.default),
      default: cast(undefined, d.type, d.default),
      help: d.help,
    });
  }
  return out;
}

export const WALLET_SETTING_TYPES = Object.fromEntries(WALLET_SETTINGS.map((d) => [d.key, d.type])) as Record<string, WalletSettingType>;
