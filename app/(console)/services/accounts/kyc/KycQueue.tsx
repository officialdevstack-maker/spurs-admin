"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Loader2, ShieldCheck, ShieldAlert, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { KycRow } from "@/lib/sdk/accounts";
import { reviewKycAction } from "./actions";

const STATUS: Record<string, { variant: "success" | "warning" | "destructive" | "secondary"; icon: typeof Clock }> = {
  verified: { variant: "success", icon: ShieldCheck },
  pending: { variant: "warning", icon: Clock },
  rejected: { variant: "destructive", icon: ShieldAlert },
  unverified: { variant: "secondary", icon: ShieldAlert },
};

const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function KycQueue({ canReview, rows }: { canReview: boolean; rows: KycRow[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);
  const [reason, setReason] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  const review = (id: number, decision: "approve" | "reject", level?: number) =>
    start(async () => {
      setBusy(id); setMsg(null);
      const res = await reviewKycAction(id, decision, level, reason[id]);
      setBusy(null);
      setMsg({ id, ok: res.ok, text: res.ok ? `Marked ${res.status}` : res.error });
    });

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-14 text-center">
          <span className="bg-muted grid size-12 place-items-center rounded-full"><ShieldCheck className="text-muted-foreground size-5" /></span>
          <p className="mt-3 text-sm font-medium">Nothing to review</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-sm">KYC submissions land here for approval.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((k) => {
        const s = STATUS[k.status] ?? STATUS.unverified;
        const Icon = s.icon;
        const open = k.status === "pending";
        return (
          <Card key={k.id}>
            <CardContent className="space-y-3 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {k.user ? (
                      <Link href={`/services/accounts/users/${k.user.id}`} className="font-medium hover:underline">{k.user.name}</Link>
                    ) : <span className="font-medium">Unknown user</span>}
                    <Badge variant={s.variant} className="gap-1"><Icon className="size-3" />{k.status}</Badge>
                    {k.level > 0 && <Badge variant="outline">Tier {k.level}</Badge>}
                    {k.duplicates > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <Users className="size-3" /> ID reused on {k.duplicates} other account{k.duplicates === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {k.user?.email} · submitted {when(k.submitted_at)}
                    {k.reviewed_by ? ` · reviewed by ${k.reviewed_by}` : ""}
                  </div>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="ID type" value={(k.id_type ?? "—").toUpperCase()} />
                <Detail label="ID number" value={k.id_masked ?? "—"} mono />
                <Detail label="Name on ID" value={k.full_name ?? "—"} />
                <Detail label="Phone" value={k.phone ?? "—"} />
              </div>

              {k.rejection_reason && <p className="text-destructive text-xs">Rejected: {k.rejection_reason}</p>}

              {open && canReview && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <Button size="sm" disabled={pending && busy === k.id} onClick={() => review(k.id, "approve", 1)}>
                    {pending && busy === k.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Approve tier 1
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending && busy === k.id} onClick={() => review(k.id, "approve", 2)}>
                    Approve tier 2
                  </Button>
                  <Input
                    placeholder="Reason (for rejection)"
                    value={reason[k.id] ?? ""}
                    onChange={(e) => setReason((r) => ({ ...r, [k.id]: e.target.value }))}
                    className="h-8 w-full sm:w-56"
                  />
                  <Button size="sm" variant="destructive" disabled={pending && busy === k.id} onClick={() => review(k.id, "reject")}>
                    <X className="size-3.5" /> Reject
                  </Button>
                </div>
              )}

              {msg?.id === k.id && (
                <p className={"text-xs " + (msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{msg.text}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={"truncate " + (mono ? "font-mono text-xs" : "text-sm")}>{value}</div>
    </div>
  );
}
