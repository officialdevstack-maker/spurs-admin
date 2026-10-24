"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, Trash2, ShieldCheck, Lock, Star, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSION_CATALOGUE } from "@/lib/permissions";
import { saveRoleAction, deleteRoleAction } from "../actions";

export interface RoleRow {
  slug: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  permissions: string[] | "*";
  admins: number;
}

const blank = (): RoleRow => ({
  slug: "", label: "", description: "", isSystem: false, isDefault: false,
  permissions: [], admins: 0,
});

export default function RolesManager({ roles, canManage }: { roles: RoleRow[]; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null);

  const open = (role: RoleRow | null) => {
    setError(null);
    setIsNew(!role);
    setEditing(role ? { ...role, permissions: role.permissions === "*" ? "*" : [...role.permissions] } : blank());
  };

  const toggle = (key: string) => {
    if (!editing || editing.permissions === "*") return;
    const has = editing.permissions.includes(key);
    setEditing({
      ...editing,
      permissions: has ? editing.permissions.filter((p) => p !== key) : [...editing.permissions, key],
    });
  };

  const toggleGroup = (keys: string[], on: boolean) => {
    if (!editing || editing.permissions === "*") return;
    const set = new Set(editing.permissions);
    keys.forEach((k) => (on ? set.add(k) : set.delete(k)));
    setEditing({ ...editing, permissions: [...set] });
  };

  const save = () => {
    if (!editing) return;
    start(async () => {
      setError(null);
      const res = await saveRoleAction({
        slug: editing.slug.trim().toLowerCase(),
        label: editing.label,
        description: editing.description ?? undefined,
        permissions: editing.permissions === "*" ? [] : editing.permissions,
        isDefault: editing.isDefault,
        isNew,
      });
      if (res.ok) setEditing(null);
      else setError(res.error);
    });
  };

  const remove = () => {
    if (!confirmDelete) return;
    const role = confirmDelete;
    start(async () => {
      setError(null);
      const res = await deleteRoleAction(role.slug);
      setConfirmDelete(null);
      if (!res.ok) setError(res.error);
    });
  };

  const held = editing?.permissions === "*" ? null : (editing?.permissions ?? []);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          These roles govern <strong>console staff</strong> — they're separate from the customer roles
          in Accounts, which decide what people can do inside the Spurs products. A customer role can
          never grant console access.
        </p>
      </div>

      <div className="flex justify-end">
        {canManage && (
          <Button size="sm" onClick={() => open(null)}><Plus className="size-3.5" /> New role</Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => {
          const count = role.permissions === "*" ? "every" : role.permissions.length;
          return (
            <Card key={role.slug}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {role.label}
                    {role.isSystem && (
                      <Badge variant="outline" className="gap-1"><Lock className="size-3" /> built-in</Badge>
                    )}
                    {role.isDefault && (
                      <Badge variant="secondary" className="gap-1"><Star className="size-3" /> default</Badge>
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">{role.description ?? "No description"}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{count}</div>
                  <p className="text-muted-foreground text-xs">permissions</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  {role.admins} {role.admins === 1 ? "person holds" : "people hold"} this role
                </p>

                {canManage && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => open(role)}
                      disabled={role.slug === "superadmin"}>
                      {role.slug === "superadmin" ? "Always holds everything" : "Edit permissions"}
                    </Button>
                    {!role.isSystem && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(role)}>
                        <Trash2 className="size-3.5 text-red-600" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "New role" : `Edit ${editing?.label}`}</DialogTitle>
            <DialogDescription>
              Tick what this role may do. Anything left unticked is refused server-side, not just
              hidden.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="role-label">Name</Label>
                  <Input id="role-label" value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    placeholder="Support agent" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-slug">Slug</Label>
                  <Input id="role-slug" value={editing.slug} disabled={!isNew}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    placeholder="support" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-desc">Description</Label>
                <Input id="role-desc" value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="What this role is for" />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.isDefault} className="size-4"
                  onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
                Give this role to new admins by default
              </label>

              <div className="space-y-4">
                {PERMISSION_CATALOGUE.map((group) => {
                  const keys = group.permissions.map((p) => p.key);
                  const all = held ? keys.every((k) => held.includes(k)) : true;
                  return (
                    <div key={group.group} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-medium">{group.group}</h3>
                          <p className="text-muted-foreground text-xs">{group.description}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => toggleGroup(keys, !all)}>
                          {all ? "None" : "All"}
                        </Button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {group.permissions.map((p) => (
                          <label key={p.key} className="flex cursor-pointer items-start gap-2.5">
                            <input type="checkbox" className="mt-0.5 size-4"
                              checked={held ? held.includes(p.key) : true}
                              onChange={() => toggle(p.key)} />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                                {p.label}
                                {p.sensitive && (
                                  <Badge variant="outline" className="gap-1 text-amber-600">
                                    <AlertTriangle className="size-2.5" /> sensitive
                                  </Badge>
                                )}
                              </span>
                              <span className="text-muted-foreground block text-xs">{p.detail}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.label}?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.admins
                ? "People still hold this role — move them to another one first."
                : "This can't be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={remove} disabled={pending || !!confirmDelete?.admins}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
