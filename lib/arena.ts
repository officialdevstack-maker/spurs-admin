import "server-only";
import { resolveConfig } from "@/lib/credentials";

/**
 * Admin-side client for Spurs Arena (esports). Admins drive content + settlement
 * over the shared internal secret — never touching players' funds directly (all
 * money moves through the arena's Wallet escrow). Fails soft so the console never
 * breaks when the arena is down.
 */

export interface ArenaGame {
  id: string; slug: string; name: string; platform: string;
  active: boolean; sortOrder: number;
  supports1v1: boolean; supportsBetting: boolean; supportsTournaments: boolean;
  linkable: boolean; provider: string; handleLabel: string;
}
export interface ArenaDispute {
  id: string; title: string; stakeMinor: number;
  creatorId: string; creatorName: string | null;
  opponentId: string | null; opponentName: string | null;
}
export interface ArenaMatch {
  id: string; gameName: string; homeName: string; awayName: string; competition: string | null;
  startsAt: string; status: string; homeOddsX100: number | null; awayOddsX100: number | null; bettingOpen: boolean;
}
export interface ArenaTournament {
  id: string; slug: string; name: string; gameName: string; status: string; entryMinor: number;
  players: number; maxPlayers: number; prizeModel: string;
  entrants: { userId: string; name: string | null }[];
}
export interface ArenaOrder { id: string; title: string; priceMinor: number; status: string; buyerId: string; sellerId: string; }
export interface ArenaNotification {
  id: string; audience: string; userId: string | null; title: string; body: string;
  level: string; href: string | null; createdBy: string | null; createdAt: string;
}
export interface ArenaLevel { level: number; minXp: number; title: string; rewardMinor: number; }

export interface ArenaOverview {
  counts: { games: number; disputes: number; openMatches: number; tournaments: number; orders: number };
  games: ArenaGame[];
  levels: ArenaLevel[];
  disputes: ArenaDispute[];
  matches: ArenaMatch[];
  tournaments: ArenaTournament[];
  orders: ArenaOrder[];
  notifications: ArenaNotification[];
}

async function endpoint() {
  const cfg = await resolveConfig("esport").catch(() => ({}) as Record<string, string>);
  const base = (cfg.ESPORT_INTERNAL_URL ?? process.env.ESPORT_INTERNAL_URL ?? "http://127.0.0.1:3600").replace(/\/$/, "");
  const secret = cfg.INTERNAL_API_SECRET ?? process.env.INTERNAL_API_SECRET ?? "";
  return { base, secret };
}

export async function overview(): Promise<ArenaOverview | null> {
  try {
    const { base, secret } = await endpoint();
    const res = await fetch(`${base}/api/private/esports/admin`, {
      headers: { Accept: "application/json", "x-internal-secret": secret },
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ArenaOverview;
  } catch {
    return null;
  }
}

export async function arenaAction(action: string, payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const { base, secret } = await endpoint();
    const res = await fetch(`${base}/api/private/esports/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j?.error ?? `Failed (${res.status})` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
