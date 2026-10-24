"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Role, PermissionCatalog } from "@/lib/sdk/accounts";
import { createRoleAction, updateRoleAction } from "./actions";

const BACK = "/services/accounts/roles";

export default function RoleForm({ role, catalog }: { role: Role | null; catalog: PermissionCatalog }) {
  const isEdit = !!role;
  const router = useRouter();

  const [name, setName] = useState(role?.name ?? "");
  const [label, setLabel] = useState(role?.label ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [isDefault, setIsDefault] = useState(role?.is_default ?? false);
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const locked = role?.name === "superadmin"; // never weaken the root role
  const togglePerm = (key: string) =>
    setPerms((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const toggleService = (keys: string[], on: boolean) =>
    setPerms((prev) => {
      const n = new Set(prev);
      keys.forEach((k) => (on ? n.add(k) : n.delete(k)));
      return n;
    });

  const save = () =>
    start(async () => {
      setErr(null);
      const permissions = Array.from(perms);
      const res = isEdit
        ? await updateRoleAction(role!.id, role!.name, { label, description, is_default: isDefault, permissions })
        : await createRoleAction({ name, label, description, is_default: isDefault, permissions });
      if (res.ok) { router.push(BACK); router.refresh(); }
      else setErr(res.error);
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={BACK} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="size-4" /> Back to roles
        </Link>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{isEdit ? `Edit ${role!.label}` : "New role"}</h2>
        <p className="text-muted-foreground text-sm">
          {locked
            ? "The superadmin role always has every permission."
            : "Roles live in Accounts and travel with every sign-in — changes reach Pay, Wallet, Cloud and the rest of Spurs Cloud."}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Label</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Finance Manager" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Slug</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="finance-manager" disabled={isEdit} />
              {isEdit && <p className="text-muted-foreground text-xs">The slug can’t be changed after creation.</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this role is for" />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Default role</div>
              <div className="text-muted-foreground text-xs">Automatically granted to every new account.</div>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </CardContent>
      </Card>

      {!locked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Permissions</CardTitle>
            <p className="text-muted-foreground text-sm">Namespaced per service. A <code className="text-xs">service.*</code> permission grants everything in that service.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(catalog).map(([service, list]) => {
              const keys = list.map((p) => p.key);
              const allOn = keys.every((k) => perms.has(k));
              return (
                <div key={service} className="rounded-lg border">
                  <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide">{service}</span>
                    <button type="button" className="text-primary text-xs hover:underline" onClick={() => toggleService(keys, !allOn)}>
                      {allOn ? "Clear" : "Select all"}
                    </button>
                  </div>
                  <div className="grid gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2">
                    {list.map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input type="checkbox" className="accent-primary mt-0.5 size-4" checked={perms.has(p.key)} onChange={() => togglePerm(p.key)} />
                        <span className="min-w-0">
                          <span className={cn("font-mono text-xs", p.key.endsWith(".*") && "text-primary font-semibold")}>{p.key}</span>
                          {p.description && <span className="text-muted-foreground block text-xs">{p.description}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {err && <p className="text-destructive text-sm">{err}</p>}

      <div className="bg-background/80 sticky bottom-0 flex items-center gap-2 border-t py-3 backdrop-blur">
        <Button onClick={save} disabled={pending || !label || (!isEdit && !name)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {isEdit ? "Save changes" : "Create role"}
        </Button>
        <Button variant="ghost" asChild><Link href={BACK}>Cancel</Link></Button>
        {!locked && <span className="text-muted-foreground ml-auto text-xs">{Array.from(perms).filter((p) => !p.endsWith(".*")).length} permissions selected</span>}
      </div>
    </div>
  );
}
