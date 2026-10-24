"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck, Ban, PauseCircle, Sparkles, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { setStandingAction, adjustXpAction } from "../actions";
import ClientPagination, { usePaged } from "@/components/ClientPagination";
import type { EarnerRow } from "@/lib/sdk/survey";

const LEVEL_NAME = ["", "Rookie", "Bronze", "Silver", "Gold", "Elite"];

const STATUS_TONE: Record<string, string> = {
  active: "text-emerald-600",
  restricted: "text-amber-600",
  banned: "text-red-600",
};

export default function EarnersTable({
  rows,
  canManageStanding,
  canAdjustXp,
}: {
  rows: EarnerRow[];
  canManageStanding: boolean;
  canAdjustXp: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [standing, setStanding] = useState<{ row: EarnerRow; status: "active" | "restricted" | "banned" } | null>(null);
  const [xp, setXp] = useState<EarnerRow | null>(null);
  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("");

  const filtered = q
    ? rows.filter((r) =>
        [r.name, r.email, r.userId].some((v) => v?.toLowerCase().includes(q.toLowerCase())))
    : rows;
  const paged = usePaged(filtered, 25);

  const applyStanding = () => {
    if (!standing) return;
    const { row, status } = standing;
    start(async () => {
      setError(null);
      const res = await setStandingAction(row.userId, status, reason);
      setStanding(null); setReason("");
      if (!res.ok) setError(res.error);
    });
  };

  const applyXp = () => {
    if (!xp) return;
    const amount = Number(delta);
    if (!Number.isInteger(amount) || amount === 0) { setError("Enter a whole number of XP"); return; }
    start(async () => {
      setError(null);
      const res = await adjustXpAction(xp.userId, amount, reason);
      setXp(null); setDelta(""); setReason("");
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Earners ({rows.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Ranked by XP. Standing and XP overrides here beat the automated anti-cheat decisions.
            </p>
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email" className="max-w-56" />
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs">
                <tr>
                  <th className="px-5 py-2 font-medium">User</th>
                  <th className="px-5 py-2 font-medium">Level</th>
                  <th className="px-5 py-2 font-medium">XP</th>
                  <th className="px-5 py-2 font-medium">Streak</th>
                  <th className="px-5 py-2 font-medium">Trust</th>
                  <th className="px-5 py-2 font-medium">Balance</th>
                  <th className="px-5 py-2 font-medium">Standing</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-muted-foreground py-8 text-center">No earners found.</td></tr>
                ) : paged.slice.map((r) => (
                  <tr key={r.userId}>
                    <td className="px-5 py-2.5">
                      <Link href={`/users/${encodeURIComponent(r.userId)}`} className="font-medium hover:underline">{r.name ?? "Spurs user"}</Link>
                      <div className="text-muted-foreground text-xs">{r.email ?? r.userId}</div>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant="secondary">{r.level} · {LEVEL_NAME[r.level] ?? ""}</Badge>
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">{r.xp.toLocaleString()}</td>
                    <td className="px-5 py-2.5 tabular-nums">
                      {r.streakDays > 0
                        ? <span className="inline-flex items-center gap-1"><Flame className="size-3.5" />{r.streakDays}</span>
                        : "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={r.trustScore < 40 ? "text-amber-600" : ""}>{r.trustScore}</span>
                      {r.strikes > 0 && (
                        <span className="ml-1.5 text-xs text-red-600">{r.strikes}✕</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">{r.balance.toLocaleString()}</td>
                    <td className={`px-5 py-2.5 capitalize ${STATUS_TONE[r.status] ?? ""}`}>{r.status}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {canAdjustXp && <Button size="sm" variant="ghost" title="Adjust XP"
                          onClick={() => { setXp(r); setDelta(""); setReason(""); }}>
                          <Sparkles className="size-3.5" />
                        </Button>}
                        {canManageStanding && (r.status === "active" ? (
                          <>
                            <Button size="sm" variant="ghost" title="Restrict for a week"
                              onClick={() => { setStanding({ row: r, status: "restricted" }); setReason(""); }}>
                              <PauseCircle className="size-3.5 text-amber-600" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Ban from earning"
                              onClick={() => { setStanding({ row: r, status: "banned" }); setReason(""); }}>
                              <Ban className="size-3.5 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" title="Reinstate"
                            onClick={() => { setStanding({ row: r, status: "active" }); setReason(""); }}>
                            <ShieldCheck className="size-3.5 text-emerald-600" />
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ClientPagination page={paged.page} pages={paged.pages} total={paged.total}
              pageSize={paged.pageSize} onPage={paged.setPage} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!standing} onOpenChange={(o) => !o && setStanding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {standing?.status === "active" ? "Reinstate this account?" : `${standing?.status} this account?`}
            </DialogTitle>
            <DialogDescription>
              {standing?.status === "active"
                ? "Earning resumes immediately and their strike count is cleared, so one old signal can't re-ban them."
                : standing?.status === "restricted"
                  ? "They can't take tasks or cash out for seven days. Existing balances are untouched."
                  : "They can no longer earn or cash out. Existing balances are untouched."}
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (for the audit log)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStanding(null)}>Cancel</Button>
            <Button variant={standing?.status === "active" ? "default" : "destructive"}
              onClick={applyStanding} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!xp} onOpenChange={(o) => !o && setXp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust XP</DialogTitle>
            <DialogDescription>
              Positive to grant a bonus, negative to claw back. The level recalculates immediately.
            </DialogDescription>
          </DialogHeader>
          <Input value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))}
            placeholder="e.g. 500 or -500" inputMode="numeric" />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (for the audit log)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setXp(null)}>Cancel</Button>
            <Button onClick={applyXp} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
