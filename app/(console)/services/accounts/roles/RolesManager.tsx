"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ShieldCheck, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/sdk/accounts";
import { deleteRoleAction } from "./actions";

export default function RolesManager({ roles }: { roles: Role[] }) {
  const [pendingDelete, startDelete] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const remove = (r: Role) =>
    startDelete(async () => {
      setErr(null);
      const res = await deleteRoleAction(r.id, r.name);
      if (!res.ok) setErr(res.error);
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Roles defined here live in Accounts and travel with every sign-in — one change reaches Pay, Wallet, Cloud and the rest.
        </p>
        <Button size="sm" asChild><Link href="/services/accounts/roles/new"><Plus className="size-4" /> New role</Link></Button>
      </div>

      {err && <p className="text-destructive text-sm">{err}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {r.name === "superadmin" && <ShieldCheck className="text-primary size-4" />}
                  {r.label}
                </CardTitle>
                <div className="flex gap-1">
                  {r.is_default && <Badge variant="outline" className="text-[10px]">default</Badge>}
                  {r.is_system && <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="size-2.5" /> system</Badge>}
                </div>
              </div>
              <code className="text-muted-foreground text-xs">{r.name}</code>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground line-clamp-2 min-h-[2.5rem] text-sm">{r.description ?? "—"}</p>
              <div className="text-muted-foreground flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {r.users} user{r.users === 1 ? "" : "s"}</span>
                <span>{r.permissions.filter((p) => !p.endsWith(".*")).length} permissions</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <Link href={`/services/accounts/roles/${r.id}/edit`}><Pencil className="size-3.5" /> Edit</Link>
                </Button>
                {!r.is_system && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8" disabled={pendingDelete} onClick={() => remove(r)}>
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
