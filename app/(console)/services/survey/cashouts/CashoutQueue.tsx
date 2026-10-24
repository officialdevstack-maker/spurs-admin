"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, Loader2, Clock, ShieldAlert, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/page/EmptyState";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { approveCashoutAction, rejectCashoutAction, processPayoutsAction } from "../actions";
import ClientPagination, { usePaged } from "@/components/ClientPagination";
import type { RedemptionRow } from "@/lib/sdk/survey";

const naira = (kobo: number) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
const when = (s: string) => new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Live countdown to the moment a held cash-out is released. */
function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [left, setLeft] = useState(() => target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left <= 0) return <Badge variant="outline" className="gap-1.5 text-amber-600"><Clock className="size-3" /> Due now</Badge>;

  const s = Math.floor(left / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (
    <Badge variant="outline" className="gap-1.5 tabular-nums">
      <Clock className="size-3" /> {h}h {String(m).padStart(2, "0")}m
    </Badge>
  );
}

export default function CashoutQueue({ rows, holdNote }: { rows: RedemptionRow[]; holdNote: string }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RedemptionRow | null>(null);
  const [approving, setApproving] = useState<RedemptionRow | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [reason, setReason] = useState("");

  const awaiting = rows.filter((r) => r.status === "pending");
  const held = rows.filter((r) => r.status === "approved");
  const pagedAwaiting = usePaged(awaiting, 20);
  const pagedHeld = usePaged(held, 20);

  const approve = () => {
    if (!approving) return;
    const r = approving;
    start(async () => {
      setBusy(r.id); setError(null); setNote(null);
      const res = await approveCashoutAction(r.id, r.reference);
      setBusy(null); setApproving(null);
      if (!res.ok) setError(res.error);
    });
  };

  const reject = () => {
    if (!rejecting) return;
    const r = rejecting;
    start(async () => {
      setBusy(r.id); setError(null);
      const res = await rejectCashoutAction(r.id, r.reference, reason);
      setBusy(null); setRejecting(null); setReason("");
      if (!res.ok) setError(res.error);
    });
  };

  const release = () =>
    start(async () => {
      setError(null); setNote(null);
      const res = await processPayoutsAction();
      if (res.ok) setNote(`${res.credited} credited${res.failed ? `, ${res.failed} failed` : ""}.`);
      else setError(res.error);
      setConfirmRelease(false);
    });

  const Row = ({ r }: { r: RedemptionRow }) => (
    <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{r.name ?? "Spurs user"}</span>
          <Badge variant="secondary" className="text-xs">Lv {r.level}</Badge>
          {r.strikes > 0 && (
            <Badge variant="outline" className="gap-1 text-xs text-red-600">
              <ShieldAlert className="size-3" /> {r.strikes} strike{r.strikes > 1 ? "s" : ""}
            </Badge>
          )}
          {r.trustScore < 40 && (
            <Badge variant="outline" className="text-xs text-amber-600">Trust {r.trustScore}</Badge>
          )}
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {r.email ?? r.userId} · {r.reference} · requested {when(r.createdAt)}
        </p>
      </div>

      <div className="text-right">
        <div className="font-semibold tabular-nums">{naira(r.valueMinor)}</div>
        <div className="text-muted-foreground text-xs tabular-nums">{r.points.toLocaleString()} pts</div>
      </div>

      {r.status === "approved" ? (
        <div className="flex items-center gap-2">
          {r.creditAt && <Countdown to={r.creditAt} />}
          <span className="text-muted-foreground hidden text-xs sm:inline">by {r.reviewedBy}</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setApproving(r)} disabled={pending}>
            {busy === r.id && pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setRejecting(r); setReason(""); }} disabled={pending}>
            <X className="size-3.5" /> Decline
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {note && <p className="text-sm text-emerald-600">{note}</p>}

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Awaiting review ({awaiting.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Points have already left the user's balance. {holdNote}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {awaiting.length === 0 ? (
            <EmptyState compact icon={Check} title="Nothing waiting" description="New cash-out requests will appear here." />
          ) : pagedAwaiting.slice.map((r) => <Row key={r.id} r={r} />)}
          <ClientPagination page={pagedAwaiting.page} pages={pagedAwaiting.pages} total={pagedAwaiting.total}
            pageSize={pagedAwaiting.pageSize} onPage={pagedAwaiting.setPage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">On hold ({held.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Approved and counting down. Each credits its wallet automatically when the timer hits zero.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setConfirmRelease(true)} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            Release due now
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {held.length === 0 ? (
            <EmptyState compact icon={Clock} title="No cash-outs on hold" description="Approved requests will count down here until their payout is released." />
          ) : pagedHeld.slice.map((r) => <Row key={r.id} r={r} />)}
          <ClientPagination page={pagedHeld.page} pages={pagedHeld.pages} total={pagedHeld.total}
            pageSize={pagedHeld.pageSize} onPage={pagedHeld.setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this cash-out?</DialogTitle>
            <DialogDescription>
              {approving && <>This starts the payout hold for {approving.name ?? "the customer"} ({naira(approving.valueMinor)}). The wallet is credited when the hold elapses.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={pending}>Cancel</Button>
            <Button onClick={approve} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Approve cash-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release all due payouts?</DialogTitle>
            <DialogDescription>
              Every cash-out whose hold has elapsed will be credited now. This cannot be undone from the console.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRelease(false)} disabled={pending}>Cancel</Button>
            <Button onClick={release} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Release due payouts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this cash-out?</DialogTitle>
            <DialogDescription>
              {rejecting && <>The {rejecting.points.toLocaleString()} points go straight back to {rejecting.name ?? "the user"}. They'll see the reason you give here.</>}
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to the user)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Decline and refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
