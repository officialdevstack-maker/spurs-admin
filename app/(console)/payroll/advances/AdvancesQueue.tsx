"use client";

import { useState, useTransition } from "react";
import { HandCoins, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { reviewAdvanceAction } from "../actions";

export interface AdvanceRow {
  id: string;
  staffName: string;
  amountMinor: string;
  repaidMinor: string;
  months: number;
  reason: string | null;
  status: string;
  monthlyGrossMinor: string;
  createdAt: string;
}

const naira = (minor: string | number) => {
  const digits = BigInt(minor || 0).toString().padStart(3, "0");
  return "₦" + digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + digits.slice(-2);
};

const when = (s: string) =>
  new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Awaiting review", variant: "secondary" },
  repaying: { label: "Repaying", variant: "default" },
  repaid: { label: "Repaid", variant: "outline" },
  rejected: { label: "Declined", variant: "destructive" },
};

/**
 * Salary advance requests.
 *
 * Approving one commits the company to withholding from future pay, so the
 * screen shows the monthly repayment against the person's actual salary — the
 * number that decides whether it's affordable.
 */
export default function AdvancesQueue({ advances }: { advances: AdvanceRow[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdvanceRow | null>(null);
  const [reason, setReason] = useState("");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) after?.();
      else setError(res.error ?? "Action failed");
    });

  const awaiting = advances.filter((a) => a.status === "pending");
  const rest = advances.filter((a) => a.status !== "pending");

  const Row = ({ a, actions }: { a: AdvanceRow; actions: boolean }) => {
    const perMonth = BigInt(a.amountMinor) / BigInt(a.months);
    const gross = BigInt(a.monthlyGrossMinor);
    const share = gross > BigInt(0) ? Number((perMonth * BigInt(100)) / gross) : 0;
    const outstanding = BigInt(a.amountMinor) - BigInt(a.repaidMinor);

    return (
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3.5 last:border-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{a.staffName}</span>
            <span className="tabular-nums">{naira(a.amountMinor)}</span>
            {share >= 40 && (
              <Badge variant="outline" className="text-amber-600">
                {share}% of monthly pay
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {naira(perMonth.toString())}/month over {a.months} {a.months === 1 ? "month" : "months"}
            {a.status === "repaying" && ` · ${naira(outstanding.toString())} outstanding`}
            {a.reason ? ` · ${a.reason}` : ""} · asked {when(a.createdAt)}
          </p>
        </div>

        {actions ? (
          <div className="flex gap-2">
            <Button size="sm" disabled={pending}
              onClick={() => act(() => reviewAdvanceAction(a.id, "approved"))}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Approve
            </Button>
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => { setRejecting(a); setReason(""); }}>
              <X className="size-3.5" /> Decline
            </Button>
          </div>
        ) : (
          <Badge variant={STATUS[a.status]?.variant ?? "outline"}>
            {STATUS[a.status]?.label ?? a.status}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins className="size-4" /> Awaiting review ({awaiting.length})
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Approving means the amount is withheld from future payroll automatically.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {awaiting.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Nothing waiting.</p>
          ) : awaiting.map((a) => <Row key={a.id} a={a} actions />)}
        </CardContent>
      </Card>

      {rest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History ({rest.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {rest.map((a) => <Row key={a.id} a={a} actions={false} />)}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this advance?</DialogTitle>
            <DialogDescription>
              {rejecting && `${rejecting.staffName} asked for ${naira(rejecting.amountMinor)}. They'll see the reason you give.`}
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to them)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={pending}
              onClick={() => rejecting && act(
                () => reviewAdvanceAction(rejecting.id, "rejected", reason),
                () => setRejecting(null),
              )}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
