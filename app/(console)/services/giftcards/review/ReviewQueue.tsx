"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, Eye, ShieldAlert, Sparkles, Banknote, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ClientPagination, { usePaged } from "@/components/ClientPagination";
import { approveTradeAction, rejectTradeAction, revealTradeAction } from "../actions";
import type { TradeRow } from "@/lib/sdk/giftcards";

const naira = (minor: string) => {
  const v = BigInt(minor || 0);
  const abs = v.toString().padStart(3, "0");
  return "₦" + abs.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + abs.slice(-2);
};

const when = (s: string) =>
  new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const SIGNAL_LABEL: Record<string, string> = {
  duplicate_code: "This code was submitted before",
  submission_velocity: "Lots of submissions in an hour",
  first_trade_high_value: "First sale, high value",
  code_too_short: "Code looks too short",
  code_not_plausible: "Code doesn't look real",
  code_unreadable: "Code couldn't be read",
};

function RiskBadge({ score }: { score: number }) {
  if (score === 0) return <Badge variant="outline" className="text-emerald-600">Clean</Badge>;
  const tone = score >= 60 ? "text-red-600" : score >= 25 ? "text-amber-600" : "text-muted-foreground";
  return (
    <Badge variant="outline" className={`gap-1 tabular-nums ${tone}`}>
      <ShieldAlert className="size-3" /> {score}
    </Badge>
  );
}

/**
 * The manual gate. Nothing pays until a reviewer approves here (or the
 * automated check cleared it outright), so this screen is the last line
 * between a fraudulent card and real money.
 */
export default function ReviewQueue({ rows }: { rows: TradeRow[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TradeRow | null>(null);
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState<{ trade: TradeRow; code: string | null } | null>(null);
  const paged = usePaged(rows, 20);

  const approve = (r: TradeRow) =>
    start(async () => {
      setBusy(r.id); setError(null);
      const res = await approveTradeAction(r.id, r.reference);
      setBusy(null);
      if (!res.ok) setError(res.error);
    });

  const reject = () => {
    if (!rejecting) return;
    const r = rejecting;
    start(async () => {
      setBusy(r.id); setError(null);
      const res = await rejectTradeAction(r.id, r.reference, reason);
      setBusy(null); setRejecting(null); setReason("");
      if (!res.ok) setError(res.error);
    });
  };

  const reveal = (r: TradeRow) =>
    start(async () => {
      setError(null);
      const res = await revealTradeAction(r.id, r.reference);
      if (res.ok) setRevealed({ trade: r, code: res.code });
      else setError(res.error);
    });

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cards awaiting review ({rows.length})</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Riskiest first. Approving queues the payout — it does not pay instantly, so a mistake caught
            in the next few seconds is still recoverable. Nothing pays without a decision here.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Queue is empty.</p>
          ) : paged.slice.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.brand}</span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {r.faceValue} {r.faceCurrency}
                  </span>
                  <RiskBadge score={r.riskScore} />
                  {r.hasImages && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <ImageIcon className="size-3" /> image
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {r.name ?? r.userId} · {r.email ?? "—"} · {when(r.createdAt)} · {r.reference}
                </p>
                {r.signals?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.signals.map((s) => (
                      <span key={s} className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">
                        {SIGNAL_LABEL[s] ?? s.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="font-semibold tabular-nums">{naira(r.quotedMinor)}</div>
                <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  {r.payoutType === "credit"
                    ? <><Sparkles className="size-3" /> credit</>
                    : <><Banknote className="size-3" /> cash</>}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => reveal(r)} disabled={pending} title="Show the card code">
                  <Eye className="size-3.5" />
                </Button>
                <Button size="sm" onClick={() => approve(r)} disabled={pending}>
                  {busy === r.id && pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setRejecting(r); setReason(""); }} disabled={pending}>
                  <X className="size-3.5" /> Decline
                </Button>
              </div>
            </div>
          ))}
          <ClientPagination page={paged.page} pages={paged.pages} total={paged.total}
            pageSize={paged.pageSize} onPage={paged.setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Card code</DialogTitle>
            <DialogDescription>
              This is the card itself. Opening it is recorded against your account in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm break-all">
            {revealed?.code ?? "No code was submitted — this card was sent as an image."}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevealed(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this card?</DialogTitle>
            <DialogDescription>
              Nothing is paid. The reason you give is shown to the seller under My sales.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to the seller)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
