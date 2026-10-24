import "server-only";
import { resolveConfig } from "@/lib/credentials";

/**
 * Admin-side client for the multi-tenant AI Trader service. Admins see oversight
 * (all users) and platform settings — never individual users' broker secrets.
 * Config comes from admin's own store; fails soft so the console never breaks
 * when the trading service is down.
 */

export interface TraderUserRow {
  user_id: string;
  name: string;
  active: boolean;
  status: {
    running: boolean;
    mode: string;
    platform: string;
    connected: boolean;
    equity: number | null;
    open_positions: number;
  } | null;
  connection: { mode: string; bybit_configured: boolean; mt5_configured: boolean; bybit_testnet: boolean };
  config: { mode: string; symbols: string[]; risk_pct: number; dry_run: boolean };
}

export interface PlatformSettings {
  allowed_modes: string[];
  allow_live: boolean;
  max_risk_pct: number;
  max_portfolio_heat: number;
  default_mode: string;
  default_symbols: string[];
  paper_symbols: string[];
  trade_limit_per_period: number;
  trade_limit_period: string;
  data_provider?: string;
  data_provider_configured?: boolean;
  data_provider_account?: string;
  data_provider_region?: string;
}

async function endpoint() {
  const cfg = await resolveConfig("aitrader").catch(() => ({}) as Record<string, string>);
  const base = (cfg.TRADER_SERVICE_URL ?? process.env.TRADER_SERVICE_URL ?? "http://127.0.0.1:8100").replace(/\/$/, "");
  const internal = cfg.INTERNAL_API_SECRET ?? process.env.INTERNAL_API_SECRET ?? "";
  const platform = cfg.AITRADER_ADMIN_SECRET ?? process.env.AITRADER_ADMIN_SECRET ?? internal;
  return { base, internal, platform };
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const { base, internal, platform } = await endpoint();
    const res = await fetch(`${base}${path}`, {
      headers: {
        Accept: "application/json",
        ...(internal ? { "x-internal-secret": internal } : {}),
        ...(platform ? { "x-platform-secret": platform } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const aitrader = {
  users: async (): Promise<TraderUserRow[]> => (await get<{ users: TraderUserRow[] }>("/admin/users"))?.users ?? [],
  platform: () => get<PlatformSettings>("/admin/platform"),
};
