"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { assignRolesAction } from "./actions";
import type { Role } from "@/lib/sdk/accounts";

export default function RoleAssigner({
  userId, allRoles, assigned,
}: { userId: number; allRoles: Role[]; assigned: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assigned));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    selected.size !== assigned.length || assigned.some((r) => !selected.has(r));

  const toggle = (name: string) => {
    setMsg(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const save = () =>
    start(async () => {
      const res = await assignRolesAction(userId, Array.from(selected));
      if (res.ok) {
        setSelected(new Set(res.roles));
        setMsg({ ok: true, text: "Roles updated — effective across all services." });
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {allRoles.map((r) => {
          const on = selected.has(r.name);
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => toggle(r.name)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                on ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
            >
              <span className={cn("grid size-5 shrink-0 place-items-center rounded border", on ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                {on && <Check className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.label}
                  {r.name === "superadmin" && <ShieldCheck className="text-primary size-3.5" />}
                  {r.is_default && <Badge variant="outline" className="text-[10px]">default</Badge>}
                </div>
                {r.description && <div className="text-muted-foreground truncate text-xs">{r.description}</div>}
              </div>
              <span className="text-muted-foreground text-xs">{r.permissions.length} perms</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Save roles
        </Button>
        {msg && <span className={cn("text-xs", msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{msg.text}</span>}
      </div>
    </div>
  );
}
