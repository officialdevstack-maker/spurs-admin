"use client";

import { useState, useTransition } from "react";
import {
  UserPlus, Loader2, Copy, Check, Ban, RotateCcw, ShieldCheck, Mail, TriangleAlert, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { inviteAction, revokeInviteAction, setRoleAction, setActiveAction } from "./actions";

export interface PersonRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  teams: string[];
}

export interface InviteRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  teamName: string | null;
  expiresAt: string;
  createdAt: string;
}

const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never";

export default function PeopleTable({
  people, invites, roles, teams, canManage, mailReady,
}: {
  people: PersonRow[];
  invites: InviteRow[];
  roles: { slug: string; label: string }[];
  teams: { id: string; name: string }[];
  canManage: boolean;
  mailReady: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[0]?.slug ?? "staff");
  const [teamId, setTeamId] = useState("");
  const [invited, setInvited] = useState<{ url: string; mail: string; mailError?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const invite = () =>
    start(async () => {
      setError(null);
      const res = await inviteAction({ email, name, role, teamId });
      if (res.ok) {
        setInvited({ url: res.url, mail: res.mail, mailError: res.mailError });
        setEmail(""); setName("");
      } else setError(res.error);
    });

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Action failed");
    });

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!mailReady && canManage && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            Mail isn't configured, so invitations won't actually be delivered. You'll still get a link
            to send by hand — or set a provider under <strong>Configuration → Mail</strong>.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">People ({people.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Everyone who can sign into the console. Roles decide what each of them can do.
            </p>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => { setInviting(true); setInvited(null); }}>
              <UserPlus className="size-3.5" /> Invite
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs">
                <tr>
                  <th className="px-5 py-2 font-medium">Person</th>
                  <th className="px-5 py-2 font-medium">Role</th>
                  <th className="px-5 py-2 font-medium">Teams</th>
                  <th className="px-5 py-2 font-medium">Last signed in</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {people.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{p.name ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">{p.email}</div>
                    </td>
                    <td className="px-5 py-2.5">
                      {canManage ? (
                        <select value={p.role} disabled={pending}
                          onChange={(e) => act(() => setRoleAction(p.id, p.email, e.target.value))}
                          className="border-input bg-background h-8 rounded-md border px-2 text-sm">
                          {roles.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                        </select>
                      ) : (
                        <Badge variant="secondary">{roles.find((r) => r.slug === p.role)?.label ?? p.role}</Badge>
                      )}
                    </td>
                    <td className="text-muted-foreground px-5 py-2.5">
                      {p.teams.length ? p.teams.join(", ") : "—"}
                    </td>
                    <td className="text-muted-foreground px-5 py-2.5">{when(p.lastLoginAt)}</td>
                    <td className="px-5 py-2.5">
                      <Badge variant={p.active ? "default" : "outline"}>
                        {p.active ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {canManage && (
                        <Button size="sm" variant="ghost" disabled={pending}
                          title={p.active ? "Deactivate" : "Reactivate"}
                          onClick={() => act(() => setActiveAction(p.id, p.email, !p.active))}>
                          {p.active
                            ? <Ban className="size-3.5 text-red-600" />
                            : <RotateCcw className="size-3.5 text-emerald-600" />}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations ({pendingInvites.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Each link works once and expires. Revoking one stops it working immediately.
            </p>
          </CardHeader>
          <CardContent className="px-0">
            {pendingInvites.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 border-b px-5 py-3 last:border-0">
                <Mail className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{i.email}</div>
                  <div className="text-muted-foreground text-xs">
                    {roles.find((r) => r.slug === i.role)?.label ?? i.role}
                    {i.teamName ? ` · ${i.teamName}` : ""} · expires {when(i.expiresAt)}
                  </div>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" disabled={pending}
                    onClick={() => act(() => revokeInviteAction(i.id, i.email))}>
                    <X className="size-3.5" /> Revoke
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={inviting} onOpenChange={(o) => { if (!o) { setInviting(false); setInvited(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone to the console</DialogTitle>
            <DialogDescription>
              They'll get an email with a single-use link to set their own password.
            </DialogDescription>
          </DialogHeader>

          {invited ? (
            <div className="space-y-3">
              <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                invited.mail === "sent"
                  ? "border border-emerald-500/40 bg-emerald-500/10"
                  : "border border-amber-500/40 bg-amber-500/10"
              }`}>
                {invited.mail === "sent"
                  ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                <p className="text-muted-foreground">
                  {invited.mail === "sent"
                    ? "Invitation sent. The link below is the same one they received."
                    : `The invitation was created, but the email didn't go out${invited.mailError ? ` (${invited.mailError})` : ""}. Send them this link yourself.`}
                </p>
              </div>

              <div className="bg-muted rounded-lg p-3 font-mono text-xs break-all">{invited.url}</div>

              <Button variant="outline" className="w-full"
                onClick={() => { navigator.clipboard.writeText(invited.url); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy the link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">Email</Label>
                <Input id="inv-email" type="email" value={email} placeholder="name@spurs.com.ng"
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Name</Label>
                <Input id="inv-name" value={name} placeholder="Optional"
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-role">Role</Label>
                  <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                    {roles.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-team">Team</Label>
                  <select id="inv-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                    <option value="">No team</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                The link expires in 48 hours and can only be used once.
              </p>
            </div>
          )}

          <DialogFooter>
            {invited ? (
              <Button onClick={() => { setInviting(false); setInvited(null); }}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setInviting(false)}>Cancel</Button>
                <Button onClick={invite} disabled={pending || !email}>
                  {pending && <Loader2 className="size-3.5 animate-spin" />} Send invitation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
