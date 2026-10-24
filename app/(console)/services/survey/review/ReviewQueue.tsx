"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, ShieldAlert, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/page/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { approveSubmissionAction, rejectSubmissionAction } from "../actions";
import ClientPagination, { usePaged } from "@/components/ClientPagination";
import type { SubmissionRow } from "@/lib/sdk/survey";

const when = (s: string) => new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Plain-English names for the anti-cheat signals. */
export const SIGNAL_LABEL: Record<string, string> = {
  speed_run: "Finished too fast",
  straight_line: "Straight-lined the answers",
  junk_text: "Low-effort free text",
  duplicate_answers: "Answers match another account",
  shared_device: "Device shared with other accounts",
  shared_ip: "IP shared with other accounts",
  burst_rate: "Burst of submissions",
  prior_strikes: "Has prior strikes",
};

export function RiskBadge({ score }: { score: number }) {
  if (score === 0) return <Badge variant="outline" className="text-emerald-600">Clean</Badge>;
  const tone = score >= 75 ? "text-red-600" : score >= 45 ? "text-amber-600" : "text-muted-foreground";
  return (
    <Badge variant="outline" className={`gap-1 tabular-nums ${tone}`}>
      <ShieldAlert className="size-3" /> {score}
    </Badge>
  );
}

export default function ReviewQueue({ rows }: { rows: SubmissionRow[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<SubmissionRow | null>(null);
  const [approving, setApproving] = useState<SubmissionRow | null>(null);
  const [reason, setReason] = useState("");
  const paged = usePaged(rows, 20);

  const approve = () => {
    if (!approving) return;
    const r = approving;
    start(async () => {
      setBusy(r.id); setError(null);
      const res = await approveSubmissionAction(r.id);
      setBusy(null); setApproving(null);
      if (!res.ok) setError(res.error);
    });
  };

  const reject = () => {
    if (!rejecting) return;
    const r = rejecting;
    start(async () => {
      setBusy(r.id); setError(null);
      const res = await rejectSubmissionAction(r.id, reason);
      setBusy(null); setRejecting(null); setReason("");
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions awaiting review ({rows.length})</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Riskiest first. Approving pays the task's points and XP; rejecting pays nothing and doesn't add a strike.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <EmptyState compact icon={Check} title="Queue is empty" description="New task submissions will appear here for review." />
          ) : paged.slice.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{r.title}</span>
                  <Badge variant="secondary" className="text-xs capitalize">{r.kind.replace(/_/g, " ")}</Badge>
                  <RiskBadge score={r.riskScore} />
                  {r.durationSeconds !== null && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
                      <Timer className="size-3" /> {r.durationSeconds}s
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {r.name ?? r.userId} · {when(r.submittedAt)}
                </p>
                {r.riskSignals?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.riskSignals.map((s) => (
                      <span key={s} className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">
                        {SIGNAL_LABEL[s] ?? s.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="font-semibold tabular-nums">{r.points.toLocaleString()} pts</div>
                <div className="text-muted-foreground text-xs tabular-nums">{r.xp.toLocaleString()} XP</div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => setApproving(r)} disabled={pending}>
                  {busy === r.id && pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setRejecting(r); setReason(""); }} disabled={pending}>
                  <X className="size-3.5" /> Reject
                </Button>
              </div>
            </div>
          ))}
          <ClientPagination page={paged.page} pages={paged.pages} total={paged.total}
            pageSize={paged.pageSize} onPage={paged.setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this submission?</DialogTitle>
            <DialogDescription>
              {approving && <>This awards {approving.points.toLocaleString()} points and {approving.xp.toLocaleString()} XP to {approving.name ?? approving.userId}.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={pending}>Cancel</Button>
            <Button onClick={approve} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Approve submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this submission?</DialogTitle>
            <DialogDescription>
              Nothing is paid. The reason appears on the task in the user's activity.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the user)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
