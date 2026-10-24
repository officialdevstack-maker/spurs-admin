"use client";

import { useState, useTransition } from "react";
import { UserPlus, X, Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addMemberAction, removeMemberAction } from "../actions";

export interface Member { id: string; name: string | null; email: string; teamRole: string }
export interface Candidate { id: string; name: string | null; email: string }

/** Membership of one team — add, promote to lead, remove. */
export default function TeamMembers({
  teamId, members, candidates, canManage,
}: {
  teamId: string;
  members: Member[];
  candidates: Candidate[];
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState("");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Action failed");
    });

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nobody in this team yet — alerts for its apps have nowhere to go.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span key={m.id} className="bg-muted flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-sm">
              {m.teamRole === "lead" && <Crown className="size-3.5 text-amber-600" />}
              <span>{m.name ?? m.email}</span>
              {canManage && (
                <>
                  <button
                    onClick={() => act(() => addMemberAction(teamId, m.id, m.teamRole === "lead" ? "member" : "lead"))}
                    disabled={pending}
                    title={m.teamRole === "lead" ? "Make a member" : "Make the lead"}
                    className="text-muted-foreground hover:text-foreground text-xs">
                    {m.teamRole === "lead" ? "lead" : "member"}
                  </button>
                  <button onClick={() => act(() => removeMemberAction(teamId, m.id))} disabled={pending}
                    className="hover:bg-background grid size-5 place-items-center rounded-full" title="Remove">
                    <X className="size-3" />
                  </button>
                </>
              )}
            </span>
          ))}
        </div>
      )}

      {canManage && candidates.length > 0 && (
        <div className="flex items-center gap-2">
          <select value={adding} onChange={(e) => setAdding(e.target.value)}
            className="border-input bg-background h-8 rounded-md border px-2 text-sm">
            <option value="">Add someone…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name ?? c.email}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" disabled={pending || !adding}
            onClick={() => act(async () => {
              const res = await addMemberAction(teamId, adding, "member");
              setAdding("");
              return res;
            })}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
