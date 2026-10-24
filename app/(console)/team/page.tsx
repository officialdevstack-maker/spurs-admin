import { requirePermission, can } from "@/lib/auth";
import { listAdmins, listInvites, listTeams } from "@/lib/teams";
import { listRoles } from "@/lib/rbac";
import { mailHealth } from "@/lib/mail/settings";
import PeopleTable, { type PersonRow, type InviteRow } from "./PeopleTable";

export const dynamic = "force-dynamic";

export default async function People() {
  await requirePermission("console.access");

  const [people, invites, roles, teams, health, canManage] = await Promise.all([
    listAdmins(), listInvites(), listRoles(), listTeams(), mailHealth(),
    can("console.admins.manage"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-muted-foreground text-sm">
          Console users, their roles, and outstanding invitations.
        </p>
      </div>

      <PeopleTable
        canManage={canManage}
        mailReady={health.ready && health.enabled && !health.isDevelopmentOnly}
        people={people.map((p): PersonRow => ({
          id: p.id, email: p.email, name: p.name, role: p.role, active: p.active,
          lastLoginAt: p.lastLoginAt ? p.lastLoginAt.toISOString() : null,
          teams: p.teams,
        }))}
        invites={invites.map((i): InviteRow => ({
          id: i.id, email: i.email, name: i.name, role: i.role, status: i.status,
          teamName: i.teamName,
          expiresAt: i.expiresAt.toISOString(),
          createdAt: i.createdAt.toISOString(),
        }))}
        roles={roles.map((r) => ({ slug: r.role.slug, label: r.role.label }))}
        teams={teams.map((t) => ({ id: t.team.id, name: t.team.name }))}
      />
    </div>
  );
}
