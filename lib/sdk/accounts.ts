import "server-only";

/**
 * Spurs Accounts admin SDK — the typed bridge from the control plane to the
 * identity provider's internal API. Accounts stays the source of truth for
 * identity, roles and permissions; this client reads and mutates it over the
 * shared internal secret. Server-only — the secret must never reach a browser.
 */

const BASE = (process.env.ACCOUNTS_ADMIN_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const SECRET = process.env.INTERNAL_API_SECRET ?? "";

export interface RoleRef { name: string; label: string }

export interface AccountsOverview {
  users: number;
  verified: number;
  avgTrust: number;
  roles: number;
  permissions: number;
  events: number;
  roleDistribution: { name: string; label: string; users: number }[];
  recentUsers: AccountUser[];
}

export interface AccountUser {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  trust_score: number | null;
  created_at: string | null;
  roles: RoleRef[];
}

export interface TrustFactor { code: string; label: string; delta: number }
export interface Trust { score: number; band: string; factors: TrustFactor[] }

export interface AccountUserDetail extends Omit<AccountUser, "roles" | "trust_score"> {
  roles: RoleRef[];
  trust: Trust;
  permissions: string[];
  connected_apps: number;
  security_events: { type: string; label: string; ip: string | null; device: string | null; at: string | null }[];
}

export interface Analytics {
  loginsSeries: { date: string; count: number }[];
  signupsSeries: { date: string; count: number }[];
  trustBands: { band: string; count: number }[];
}

export interface KycRow {
  id: number;
  user: { id: number; name: string; email: string } | null;
  level: number;
  status: "unverified" | "pending" | "verified" | "rejected";
  tier: string;
  id_type: string | null;
  id_masked: string | null;
  full_name: string | null;
  phone: string | null;
  state: string | null;
  country: string | null;
  duplicates: number;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface KycQueue {
  kyc: KycRow[];
  counts: { pending: number; verified: number; rejected: number };
}

export interface SettingItem {
  key: string;
  label: string;
  type: "bool" | "int" | "string" | "text";
  value: boolean | number | string;
  default: boolean | number | string;
  help: string;
  effect: boolean;
}
export type SettingsCatalog = Record<string, SettingItem[]>;

export interface Role {
  id: number;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  is_default: boolean;
  users: number;
  permissions: string[];
}

export type PermissionCatalog = Record<string, { key: string; description: string | null }[]>;

export interface RiskSignal { code: string; label: string; weight: number }

export interface SecurityEvent {
  id: number;
  type: string;
  label: string;
  ip: string | null;
  device: string | null;
  country: string | null;
  location: string;
  risk: number;
  flagged: boolean;
  signals: RiskSignal[];
  user: { id: number; name: string; email: string } | null;
  at: string | null;
}

export interface FraudOverview {
  flagged: number;
  highRisk: number;
  failed24h: number;
  countries: number;
  distinctIps: number;
  topCountries: { name: string; count: number }[];
  topIps: { ip: string; count: number; users: number }[];
}

class AccountsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}/api/admin${path}`;
  const method = init?.method ?? "GET";
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-Internal-Secret": SECRET,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "unknown";

  if (!res.ok) {
    let message = `Accounts API ${res.status} ${method} ${url}`;
    try {
      const body = JSON.parse(text);
      message = body.message ?? JSON.stringify(body);
    } catch {
      message += ` - invalid JSON error body (${contentType})`;
    }
    throw new AccountsError(message, res.status);
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    const snippet = text.trim().slice(0, 300).replace(/\s+/g, " ");
    throw new AccountsError(
      `Accounts API ${res.status} ${method} ${url}: invalid JSON response (content-type=${contentType}) - ${snippet}`,
      res.status,
    );
  }
}

export const accounts = {
  overview: () => call<AccountsOverview>("/overview"),
  users: (q?: string) => call<{ users: AccountUser[] }>(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => r.users),
  user: (id: number | string) => call<AccountUserDetail>(`/users/${id}`),
  roles: () => call<{ roles: Role[] }>("/roles").then((r) => r.roles),
  permissions: () => call<{ permissions: PermissionCatalog }>("/permissions").then((r) => r.permissions),
  analytics: (days = 14) => call<Analytics>(`/analytics?days=${days}`),
  kycQueue: (status?: string) => call<KycQueue>(`/kyc${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  reviewKyc: (id: number, input: { decision: "approve" | "reject"; level?: number; reason?: string; reviewer?: string }) =>
    call<{ ok: boolean; status: string; level: number }>(`/kyc/${id}/review`, { method: "POST", body: JSON.stringify(input) }),

  settings: () => call<{ settings: SettingsCatalog }>("/settings").then((r) => r.settings),
  updateSettings: (values: Record<string, unknown>) =>
    call<{ ok: boolean; settings: SettingsCatalog }>("/settings", { method: "PUT", body: JSON.stringify({ values }) }),
  securityEvents: (limit = 100) => call<{ events: SecurityEvent[] }>(`/security-events?limit=${limit}`).then((r) => r.events),
  fraudOverview: () => call<FraudOverview>("/fraud/overview"),
  fraudAlerts: (limit = 100) => call<{ alerts: SecurityEvent[] }>(`/fraud/alerts?limit=${limit}`).then((r) => r.alerts),

  assignRoles: (userId: number | string, roles: string[]) =>
    call<{ ok: boolean; roles: string[] }>(`/users/${userId}/roles`, { method: "POST", body: JSON.stringify({ roles }) }),

  createRole: (input: { name: string; label: string; description?: string; is_default?: boolean; permissions: string[] }) =>
    call<{ ok: boolean; id: number }>("/roles", { method: "POST", body: JSON.stringify(input) }),

  updateRole: (id: number, input: { label?: string; description?: string; is_default?: boolean; permissions?: string[] }) =>
    call<{ ok: boolean }>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteRole: (id: number) => call<{ ok: boolean }>(`/roles/${id}`, { method: "DELETE" }),
};

export { AccountsError };
