import { UsersRound, Bell, Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePermission, can } from "@/lib/auth";
import { listTeams, listAdmins } from "@/lib/teams";
import { createTeamAction, updateTeamAction } from "../actions";
import TeamMembers from "./TeamMembers";

export const dynamic = "force-dynamic";

const APPS = ["accounts", "pay", "wallet", "baas", "cloud", "survey", "giftcards", "admin"];

export default async function Teams() {
  await requirePermission("console.access");
  const [teams, admins, canManage] = await Promise.all([
    listTeams(), listAdmins(), can("console.teams.manage"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-muted-foreground text-sm">
          Who owns which service, and who hears about it when something happens there.
        </p>
      </div>

      {teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="bg-muted grid size-12 place-items-center rounded-full">
              <UsersRound className="text-muted-foreground size-5" />
            </span>
            <p className="mt-4 text-sm font-medium">No teams yet</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Create one below and give it the apps it owns. An app with no owning team is one nobody
              is watching.
            </p>
          </CardContent>
        </Card>
      )}

      {teams.map(({ team, members }) => (
        <Card key={team.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {team.name}
                <Badge variant="outline">{team.slug}</Badge>
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {team.description ?? "No description"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {team.apps.length === 0 ? (
                  <span className="text-muted-foreground text-xs">Owns no apps yet</span>
                ) : team.apps.map((app) => (
                  <Badge key={app} variant="secondary" className="gap-1">
                    <Boxes className="size-3" /> {app}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Bell className="size-3.5" />
              {team.alertEmail ?? `${members.length} member${members.length === 1 ? "" : "s"}`}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <TeamMembers
              teamId={team.id}
              members={members.map((m) => ({ id: m.id, name: m.name, email: m.email, teamRole: m.teamRole }))}
              candidates={admins
                .filter((a) => a.active && !members.some((m) => m.id === a.id))
                .map((a) => ({ id: a.id, name: a.name, email: a.email }))}
              canManage={canManage}
            />

            {canManage && (
              <form action={updateTeamAction} className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
                <input type="hidden" name="slug" value={team.slug} />
                <div className="space-y-1.5">
                  <Label htmlFor={`${team.slug}-name`}>Name</Label>
                  <Input id={`${team.slug}-name`} name="name" defaultValue={team.name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${team.slug}-desc`}>Description</Label>
                  <Input id={`${team.slug}-desc`} name="description" defaultValue={team.description ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${team.slug}-alert`}>Alert email</Label>
                  <Input id={`${team.slug}-alert`} name="alertEmail" type="email"
                    defaultValue={team.alertEmail ?? ""} placeholder="Falls back to members" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${team.slug}-apps`}>Apps owned</Label>
                  <Input id={`${team.slug}-apps`} name="apps" defaultValue={team.apps.join(", ")}
                    placeholder={APPS.slice(0, 3).join(", ")} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Save</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ))}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New team</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Apps is a comma-separated list of slugs — {APPS.join(", ")}.
            </p>
          </CardHeader>
          <CardContent>
            <form action={createTeamAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label htmlFor="new-slug">Slug</Label>
                <Input id="new-slug" name="slug" placeholder="payments" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Name</Label>
                <Input id="new-name" name="name" placeholder="Payments team" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-desc">Description</Label>
                <Input id="new-desc" name="description" placeholder="Owns Pay and Wallet" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-apps">Apps owned</Label>
                <Input id="new-apps" name="apps" placeholder="pay, wallet" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">Create team</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
