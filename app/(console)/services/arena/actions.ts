"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { upsertCredential } from "@/lib/credentials";
import { logAction } from "@/lib/audit";
import { arenaAction } from "@/lib/arena";

const naira = (v: FormDataEntryValue | null) => Math.round(Number(v ?? 0) * 100);
const oddsX100 = (v: FormDataEntryValue | null) => { const n = Number(v ?? 0); return n > 1 ? Math.round(n * 100) : 0; };
const bump = () => { revalidatePath("/services/arena"); revalidatePath("/services/arena/matches"); revalidatePath("/services/arena/games"); };

/* ------------------------------------------------------------- settlement */

export async function resolveDisputeAction(fd: FormData) {
  const admin = await requireAdmin();
  const challengeId = String(fd.get("challengeId") ?? "");
  const winnerId = String(fd.get("winnerId") ?? "").trim(); // "" = void (refund both)
  const r = await arenaAction("challenge.resolve", { challengeId, winnerId: winnerId || undefined });
  if (r.ok) await logAction(admin, "arena.dispute.resolve", challengeId, { winnerId: winnerId || "void" });
  bump();
}

export async function settleMatchAction(fd: FormData) {
  const admin = await requireAdmin();
  const matchId = String(fd.get("matchId") ?? "");
  const result = String(fd.get("result") ?? "");
  const homeScore = fd.get("homeScore") ? Number(fd.get("homeScore")) : undefined;
  const awayScore = fd.get("awayScore") ? Number(fd.get("awayScore")) : undefined;
  const r = await arenaAction("match.settle", { matchId, result, homeScore, awayScore });
  if (r.ok) await logAction(admin, "arena.match.settle", matchId, { result });
  bump();
}

export async function finalizeTournamentAction(fd: FormData) {
  const admin = await requireAdmin();
  const tournamentId = String(fd.get("tournamentId") ?? "");
  // Ranked winners, first place first — one user id per line or comma-separated.
  const rankedUserIds = String(fd.get("rankedUserIds") ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const r = await arenaAction("tournament.finalize", { tournamentId, rankedUserIds });
  if (r.ok) await logAction(admin, "arena.tournament.finalize", tournamentId, { places: rankedUserIds.length });
  bump();
}

export async function refundOrderAction(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = String(fd.get("orderId") ?? "");
  const r = await arenaAction("order.refund", { orderId });
  if (r.ok) await logAction(admin, "arena.order.refund", orderId);
  bump();
}

/* ---------------------------------------------------------------- content */

export async function seedGamesAction() {
  const admin = await requireAdmin();
  await arenaAction("seed", {});
  await logAction(admin, "arena.seed", "games");
  bump();
}

export async function upsertGameAction(fd: FormData) {
  const admin = await requireAdmin();
  const game = {
    slug: String(fd.get("slug") ?? "").trim().toLowerCase(),
    name: String(fd.get("name") ?? "").trim(),
    platform: String(fd.get("platform") ?? "crossplay"),
    sortOrder: Number(fd.get("sortOrder") ?? 0) || 0,
    active: String(fd.get("active") ?? "true") === "true",
    supports1v1: fd.get("supports1v1") === "on",
    supportsBetting: fd.get("supportsBetting") === "on",
    supportsTournaments: fd.get("supportsTournaments") === "on",
    linkable: fd.get("linkable") === "on",
    provider: String(fd.get("provider") ?? "manual"),
    handleLabel: String(fd.get("handleLabel") ?? "Player ID").trim() || "Player ID",
  };
  await arenaAction("game.upsert", { game });
  await logAction(admin, "arena.game.upsert", game.slug);
  bump();
}

/* ------------------------------------------------------------------ levels */

const bumpLevels = () => revalidatePath("/services/arena/levels");

export async function seedLevelsAction() {
  const admin = await requireAdmin();
  await arenaAction("levels.seed", {});
  await logAction(admin, "arena.levels.seed", "levels");
  bumpLevels();
}

export async function upsertLevelAction(fd: FormData) {
  const admin = await requireAdmin();
  const level = {
    level: Number(fd.get("level") ?? 0),
    minXp: Number(fd.get("minXp") ?? 0),
    title: String(fd.get("title") ?? "").trim(),
    rewardMinor: naira(fd.get("reward")), // admin enters naira → kobo
  };
  const r = await arenaAction("level.upsert", { level });
  if (r.ok) await logAction(admin, "arena.level.upsert", String(level.level));
  bumpLevels();
}

export async function deleteLevelAction(fd: FormData) {
  const admin = await requireAdmin();
  const level = Number(fd.get("level") ?? 0);
  const r = await arenaAction("level.delete", { level });
  if (r.ok) await logAction(admin, "arena.level.delete", String(level));
  bumpLevels();
}

export async function sendNotificationAction(fd: FormData) {
  const admin = await requireAdmin();
  const audience = String(fd.get("audience") ?? "all") === "user" ? "user" : "all";
  const notification = {
    audience,
    userId: audience === "user" ? String(fd.get("userId") ?? "").trim() : null,
    title: String(fd.get("title") ?? "").trim(),
    body: String(fd.get("body") ?? "").trim(),
    level: String(fd.get("level") ?? "info"),
    href: String(fd.get("href") ?? "").trim() || null,
    createdBy: admin.email,
  };
  const r = await arenaAction("notification.send", { notification });
  if (r.ok) await logAction(admin, "arena.notification.send", audience, { title: notification.title });
  revalidatePath("/services/arena/notifications");
}

export async function createMatchAction(fd: FormData) {
  const admin = await requireAdmin();
  const match = {
    gameId: String(fd.get("gameId") ?? ""),
    homeName: String(fd.get("homeName") ?? "").trim(),
    awayName: String(fd.get("awayName") ?? "").trim(),
    competition: String(fd.get("competition") ?? "").trim() || null,
    startsAt: String(fd.get("startsAt") ?? ""),
    homeOddsX100: oddsX100(fd.get("homeOdds")),
    awayOddsX100: oddsX100(fd.get("awayOdds")),
    bettingOpen: true,
  };
  await arenaAction("match.create", { match });
  await logAction(admin, "arena.match.create", `${match.homeName} v ${match.awayName}`);
  bump();
}

/* ---------------------------------------------------------------- settings */

// Provider API keys + rake defaults for the arena. Read by the esport app via its
// admin-config (/api/config?app=esport). Keys are secrets; blank keeps the current.
const SECRET_KEYS = new Set(["COC_API_TOKEN", "PUBG_API_KEY"]);
const SETTING_FIELDS = ["COC_API_TOKEN", "PUBG_API_KEY", "ESPORT_INTERNAL_URL"];

export async function saveArenaSettings(formData: FormData) {
  const admin = await requireAdmin();
  const changed: string[] = [];
  for (const key of SETTING_FIELDS) {
    const raw = formData.get(key);
    if (raw === null) continue;
    const value = String(raw).trim();
    if (SECRET_KEYS.has(key) && value === "") continue;
    await upsertCredential({ appId: "esport", key, value, scope: "all", secret: SECRET_KEYS.has(key), updatedBy: admin.email });
    changed.push(key);
  }
  if (changed.length) await logAction(admin, "arena.settings.update", changed.join(","));
  revalidatePath("/services/arena/settings");
}
