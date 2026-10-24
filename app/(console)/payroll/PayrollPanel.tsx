"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Wallet, Loader2, Play, Check, Send, TriangleAlert, Users, ArrowRight, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPayrollAction, approvePayrollAction, payPayrollAction } from "./actions";

export interface RunRow {
  id: string;
  period: string;
  status: string;
  grossMinor: string;
  netMinor: string;
  employerCostMinor: string;
  headcount: number;
  approvedBy: string | null;
}

export interface Perms {
  build: boolean;
  approve: boolean;
  pay: boolean;
}

const naira = (minor: string | number) => {
  const value = BigInt(minor || 0);
  const negative = value < BigInt(0);
  const digits = (negative ? -value : value).toString().padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}₦${whole}.${digits.slice(-2)}`;
};

const monthName = (period: string) =>
  new Date(period + "-01T00:00:00Z").toLocaleDateString("en-NG", {
    month: "long", year: "numeric", timeZone: "UTC",
  });

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  approved: { label: "Approved", variant: "outline" },
  paying: { label: "Paying", variant: "outline" },
  partly_paid: { label: "Partly paid", variant: "destructive" },
  paid: { label: "Paid", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function PayrollPanel({
  runs, perms, currentPeriod,
}: {
  runs: RunRow[];
  perms: Perms;
  currentPeriod: string;
}) {
  const [pending, start] = useTransition();
  const [period, setPeriod] = useState(currentPeriod);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ name: string; reasons: string[] }[]>([]);

  const build = () =>
    start(async () => {
      setError(null); setNote(null); setSkipped([]);
      const res = await buildPayrollAction(period);
      if (!res.ok) { setError(res.error); return; }
      setNote(`Draft ready for ${monthName(period)} — ${res.headcount} ${res.headcount === 1 ? "person" : "people"}.`);
      setSkipped(res.skipped ?? []);
    });

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      setError(null); setNote(null);
      const res = await fn();
      if (res.ok) setNote(success);
      else setError(res.error ?? "Action failed");
    });

  const pay = (id: string) =>
    start(async () => {
      setError(null); setNote(null);
      const res = await payPayrollAction(id);
      if (!res.ok) { setError(res.error); return; }
      setNote(
        res.failed
          ? `Paid ${res.paid} of ${res.total}. ${res.failed} failed — open the run to see why and retry just those.`
          : `All ${res.paid} payments sent.`,
      );
    });

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {note && <p className="text-sm text-emerald-600">{note}</p>}

      {skipped.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-amber-600" />
              Left out of the draft ({skipped.length})
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              These people weren't included. Fix the reason and rebuild.
            </p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {skipped.map((s) => (
              <div key={s.name} className="text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground"> — {s.reasons.join(", ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {perms.build && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prepare a month</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Builds a draft from everyone's current package. Rebuild as often as you like — a draft
              has paid nobody.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="YYYY-MM"
                className="max-w-40"
              />
              <Button onClick={build} disabled={pending || !/^\d{4}-\d{2}$/.test(period)}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Build draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" /> Runs
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Preparing, approving and paying are separate permissions — whoever builds the numbers
            shouldn't be the one who releases the money.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="bg-muted grid size-12 place-items-center rounded-full">
                <Wallet className="text-muted-foreground size-5" />
              </span>
              <p className="mt-4 text-sm font-medium">No payroll yet</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                {perms.build
                  ? "Build a draft above to get started."
                  : "Nothing has been prepared yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="px-6 py-2 font-medium">Period</th>
                    <th className="px-6 py-2 font-medium">People</th>
                    <th className="px-6 py-2 font-medium">Gross</th>
                    <th className="px-6 py-2 font-medium">Net paid</th>
                    <th className="px-6 py-2 font-medium">Total cost</th>
                    <th className="px-6 py-2 font-medium">Status</th>
                    <th className="px-6 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {runs.map((run) => {
                    const s = STATUS[run.status] ?? { label: run.status, variant: "outline" as const };
                    return (
                      <tr key={run.id}>
                        <td className="px-6 py-3 font-medium">{monthName(run.period)}</td>
                        <td className="px-6 py-3 tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="text-muted-foreground size-3.5" />
                            {run.headcount}
                          </span>
                        </td>
                        <td className="px-6 py-3 tabular-nums">{naira(run.grossMinor)}</td>
                        <td className="px-6 py-3 font-medium tabular-nums">{naira(run.netMinor)}</td>
                        <td className="text-muted-foreground px-6 py-3 tabular-nums">
                          {naira(run.employerCostMinor)}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={s.variant}>{s.label}</Badge>
                          {run.approvedBy && (
                            <div className="text-muted-foreground mt-0.5 text-xs">by {run.approvedBy}</div>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-2">
                            {run.status === "draft" && perms.approve && (
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => act(() => approvePayrollAction(run.id), `${monthName(run.period)} approved.`)}
                              >
                                <Check className="size-3.5" /> Approve
                              </Button>
                            )}
                            {["approved", "partly_paid"].includes(run.status) && perms.pay && (
                              <Button size="sm" disabled={pending} onClick={() => pay(run.id)}>
                                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                {run.status === "partly_paid" ? "Retry failed" : "Pay everyone"}
                              </Button>
                            )}
                            <Link href={`/payroll/${run.id}`}>
                              <Button size="sm" variant="ghost">
                                <ArrowRight className="size-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Tax bands, pension and NHF rates are configurable and default to the current Nigerian
          regime — <strong className="text-foreground">confirm them with your accountant</strong>{" "}
          before a real run. Payments go to staff bank accounts through Spurs Pay.
        </p>
      </div>
    </div>
  );
}
