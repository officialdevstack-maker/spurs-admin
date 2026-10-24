import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db, admins, teams, teamMembers, adminInvites, adminRoles,
  type Team, type Admin, type AdminInvite,
} from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { defaultRoleSlug } from "@/lib/rbac";
import { sendMail } from "@/lib/mail/send";
import { getMailSettings } from "@/lib/mail/settings";

/**
 * Teams, and getting people into the console.
 *
 * Invitations exist so nobody has to hand-create an account and send a password
 * over chat. The token is random, stored only as a hash, single-use, and short
 * lived — a leaked database must not be a set of working admin accounts.
 */

const INVITE_TTL_HOURS = 48;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

/* ------------------------------------------------------------------ teams */

export interface TeamWithMembers {
  team: Team;
  members: (Admin & { teamRole: string })[];
}

export async function listTeams(): Promise<TeamWithMembers[]> {
  const rows = await db.select().from(teams).orderBy(asc(teams.name));
  return Promise.all(rows.map(async (team) => ({ team, members: await membersOf(team.id) })));
}

export async function getTeam(slug: string): Promise<TeamWithMembers | null> {
  const [team] = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
  if (!team) return null;
  return { team, members: await membersOf(team.id) };
}

export async function membersOf(teamId: string): Promise<(Admin & { teamRole: string })[]> {
  const rows = await db
    .select({ admin: admins, teamRole: teamMembers.role })
    .from(teamMembers)
    .innerJoin(admins, eq(admins.id, teamMembers.adminId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(teamMembers.role), asc(admins.name));

  return rows.map((r) => ({ ...r.admin, teamRole: r.teamRole }));
}

export interface TeamInput {
  slug: string;
  name: string;
  description?: string | null;
  alertEmail?: string | null;
  apps?: string[];
}

function validateTeam(input: TeamInput) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(input.slug)) {
    throw new Error("Slug must be lowercase letters, numbers or dashes");
  }
  if (!input.name.trim()) throw new Error("Give the team a name");
}

export async function createTeam(input: TeamInput, by: string): Promise<Team> {
  validateTeam(input);
  const [team] = await db.insert(teams).values({
    slug: input.slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    alertEmail: input.alertEmail?.trim() || null,
    apps: input.apps ?? [],
    createdBy: by,
  }).returning();
  return team;
}

export async function updateTeam(slug: string, input: Omit<TeamInput, "slug">): Promise<Team> {
  validateTeam({ ...input, slug });
  const [team] = await db.update(teams).set({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    alertEmail: input.alertEmail?.trim() || null,
    apps: input.apps ?? [],
  }).where(eq(teams.slug, slug)).returning();
  if (!team) throw new Error("Team not found");
  return team;
}

export async function deleteTeam(slug: string): Promise<void> {
  const [team] = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
  if (!team) throw new Error("Team not found");
  // Membership rows cascade; invites keep their history with a null team.
  await db.delete(teams).where(eq(teams.id, team.id));
}

export async function addMember(teamId: string, adminId: string, role = "member"): Promise<void> {
  await db.insert(teamMembers).values({ teamId, adminId, role })
    .onConflictDoUpdate({
      target: [teamMembers.teamId, teamMembers.adminId],
      set: { role },
    });
}

export async function removeMember(teamId: string, adminId: string): Promise<void> {
  await db.delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.adminId, adminId)));
}

/** Teams that own an app — used to work out who to alert. */
export async function teamsForApp(app: string): Promise<Team[]> {
  return db.select().from(teams)
    .where(sql`${teams.apps} @> ${JSON.stringify([app])}::jsonb`);
}

/**
 * Who should hear about something in this app. Prefers the team's alert
 * address, falling back to every member — an app whose owning team has no
 * contactable address is worse than a slightly noisy inbox.
 */
export async function alertRecipients(app: string): Promise<string[]> {
  const owners = await teamsForApp(app);
  const out = new Set<string>();

  for (const team of owners) {
    if (team.alertEmail) { out.add(team.alertEmail); continue; }
    for (const member of await membersOf(team.id)) out.add(member.email);
  }
  return [...out];
}

/* ---------------------------------------------------------------- invites */

export interface InviteResult {
  invite: AdminInvite;
  /** The accept URL, returned once so it can be copied if mail is down. */
  url: string;
  mail: { status: string; error?: string };
}

export async function inviteAdmin(input: {
  email: string;
  name?: string | null;
  role?: string;
  teamId?: string | null;
  invitedBy: string;
}): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");

  const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email)).limit(1);
  if (existing) throw new Error("That person already has a console account");

  const role = input.role || (await defaultRoleSlug());
  const [roleRow] = await db.select().from(adminRoles).where(eq(adminRoles.slug, role)).limit(1);
  if (!roleRow) throw new Error("That role doesn't exist");

  // Supersede any earlier pending invite for the same address, so a resend
  // doesn't leave two working tokens.
  await db.update(adminInvites)
    .set({ status: "revoked" })
    .where(and(eq(adminInvites.email, email), eq(adminInvites.status, "pending")));

  const token = randomBytes(32).toString("base64url");
  const [invite] = await db.insert(adminInvites).values({
    email,
    name: input.name?.trim() || null,
    role,
    teamId: input.teamId ?? null,
    tokenHash: hashToken(token),
    invitedBy: input.invitedBy,
    expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000),
  }).returning();

  const settings = await getMailSettings();
  const base = process.env.ADMIN_PUBLIC_URL ?? settings.appUrl ?? "http://127.0.0.1:3300";
  const url = `${base.replace(/\/$/, "")}/invite/${token}`;

  const mail = await sendMail({
    app: "admin",
    template: "admin.invite",
    to: email,
    idempotencyKey: `invite:${invite.id}`,
    context: {
      name: invite.name,
      inviter: input.invitedBy,
      role: roleRow.label,
      acceptUrl: url,
      expiresHours: INVITE_TTL_HOURS,
    },
  });

  return { invite, url, mail: { status: mail.status, error: mail.error } };
}

export async function listInvites(): Promise<(AdminInvite & { teamName: string | null })[]> {
  const rows = await db
    .select({ invite: adminInvites, teamName: teams.name })
    .from(adminInvites)
    .leftJoin(teams, eq(teams.id, adminInvites.teamId))
    .orderBy(desc(adminInvites.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...r.invite, teamName: r.teamName }));
}

export async function revokeInvite(id: string): Promise<void> {
  await db.update(adminInvites)
    .set({ status: "revoked" })
    .where(and(eq(adminInvites.id, id), eq(adminInvites.status, "pending")));
}

/** Look an invite up by its raw token. Returns null for anything unusable. */
export async function findInvite(token: string): Promise<AdminInvite | null> {
  const hash = hashToken(token);
  const [invite] = await db.select().from(adminInvites)
    .where(eq(adminInvites.tokenHash, hash)).limit(1);

  if (!invite || !safeEqual(invite.tokenHash, hash)) return null;
  if (invite.status !== "pending") return null;
  if (invite.expiresAt < new Date()) {
    await db.update(adminInvites).set({ status: "expired" }).where(eq(adminInvites.id, invite.id));
    return null;
  }
  return invite;
}

/** Accept an invitation and create the account. Single use. */
export async function acceptInvite(token: string, name: string, password: string): Promise<Admin> {
  const invite = await findInvite(token);
  if (!invite) throw new Error("That invitation is no longer valid. Ask for a new one.");
  if (password.length < 10) throw new Error("Use a password of at least 10 characters");

  const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, invite.email)).limit(1);
  if (existing) throw new Error("That person already has a console account");

  const [admin] = await db.insert(admins).values({
    email: invite.email,
    name: name.trim() || invite.name || invite.email,
    passwordHash: hashPassword(password),
    role: invite.role,
    active: true,
  }).returning();

  if (invite.teamId) await addMember(invite.teamId, admin.id);

  // Burn the token before returning — an invite must work exactly once.
  await db.update(adminInvites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(adminInvites.id, invite.id));

  return admin;
}

/* ----------------------------------------------------------------- admins */

export async function listAdmins(): Promise<(Admin & { teams: string[] })[]> {
  const rows = await db.select().from(admins).orderBy(asc(admins.name));

  const memberships = await db
    .select({ adminId: teamMembers.adminId, name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId));

  return rows.map((admin) => ({
    ...admin,
    teams: memberships.filter((m) => m.adminId === admin.id).map((m) => m.name),
  }));
}

export async function setAdminRole(adminId: string, role: string): Promise<void> {
  const [roleRow] = await db.select().from(adminRoles).where(eq(adminRoles.slug, role)).limit(1);
  if (!roleRow) throw new Error("That role doesn't exist");
  await db.update(admins).set({ role }).where(eq(admins.id, adminId));
}

/**
 * Deactivate an account. Guarded so the last superadmin can't be locked out —
 * a console nobody can administer needs database surgery to recover.
 */
export async function setAdminActive(adminId: string, active: boolean): Promise<void> {
  if (!active) {
    const [target] = await db.select().from(admins).where(eq(admins.id, adminId)).limit(1);
    if (target?.role === "superadmin") {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(admins)
        .where(and(eq(admins.role, "superadmin"), eq(admins.active, true)));
      if (Number(count) <= 1) throw new Error("This is the last active superadmin — promote someone else first");
    }
  }
  await db.update(admins).set({ active }).where(eq(admins.id, adminId));
}
