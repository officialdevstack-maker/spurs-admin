"use client";

import { useState, useTransition } from "react";
import {
  Send, Loader2, RotateCcw, Ban, Check, TriangleAlert, Info, ShieldOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientPagination, { usePaged } from "@/components/ClientPagination";
import {
  testMailAction, retryMailAction, retryAllFailedAction, suppressAction, unsuppressAction,
} from "./actions";

export interface MailRow {
  id: string;
  app: string;
  template: string;
  to: string;
  subject: string;
  status: string;
  provider: string | null;
  error: string | null;
  attempts: number;
  createdAt: string;
}

export interface SuppressionRow {
  email: string;
  reason: string;
  detail: string | null;
  createdAt: string;
}

const when = (s: string) =>
  new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  sent: { label: "Sent", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  queued: { label: "Queued", variant: "secondary" },
  suppressed: { label: "Suppressed", variant: "outline" },
};

export default function MailPanel({
  log, suppressions, canManage,
}: {
  log: MailRow[];
  suppressions: SuppressionRow[];
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [suppressEmail, setSuppressEmail] = useState("");
  const paged = usePaged(log, 20);

  const test = () =>
    start(async () => {
      setNote(null);
      const res = await testMailAction(testTo);
      setNote({
        ok: res.ok,
        text: res.ok
          ? `Sent. Check ${testTo} — if it doesn't arrive within a minute or two, look in spam before changing anything.`
          : `Didn't send: ${res.error ?? res.status}`,
      });
    });

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      setNote(null);
      const res = await fn();
      setNote({ ok: res.ok, text: res.ok ? success : (res.error ?? "Action failed") });
    });

  const failed = log.filter((m) => m.status === "failed").length;

  return (
    <div className="space-y-6">
      {note && (
        <p className={`text-sm ${note.ok ? "text-emerald-600" : "text-red-600"}`}>{note.text}</p>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send a test</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              The only honest check. A saved settings form proves nothing until a message lands in a
              real inbox.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email"
                placeholder="you@example.com" className="max-w-sm" />
              <Button onClick={test} disabled={pending || !testTo}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Delivery log ({log.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Every message the platform tried to send. This is what to search when someone says they
              never got an email.
            </p>
          </div>
          {canManage && failed > 0 && (
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => act(retryAllFailedAction, "Retried the failed messages.")}>
              <RotateCcw className="size-3.5" /> Retry {failed} failed
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {log.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nothing sent yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b text-left text-xs">
                    <tr>
                      <th className="px-5 py-2 font-medium">To</th>
                      <th className="px-5 py-2 font-medium">Subject</th>
                      <th className="px-5 py-2 font-medium">From app</th>
                      <th className="px-5 py-2 font-medium">When</th>
                      <th className="px-5 py-2 font-medium">Status</th>
                      <th className="px-5 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paged.slice.map((m) => {
                      const s = STATUS[m.status] ?? { label: m.status, variant: "outline" as const };
                      return (
                        <tr key={m.id}>
                          <td className="px-5 py-2.5">{m.to}</td>
                          <td className="px-5 py-2.5">
                            <div className="max-w-[18rem] truncate">{m.subject}</div>
                            {m.error && <div className="max-w-[18rem] truncate text-xs text-red-600">{m.error}</div>}
                          </td>
                          <td className="text-muted-foreground px-5 py-2.5">
                            {m.app}
                            <span className="block text-xs">{m.template}</span>
                          </td>
                          <td className="text-muted-foreground px-5 py-2.5">{when(m.createdAt)}</td>
                          <td className="px-5 py-2.5">
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            {canManage && m.status === "failed" && (
                              <Button size="sm" variant="ghost" disabled={pending}
                                onClick={() => act(() => retryMailAction(m.id), "Retried.")}>
                                <RotateCcw className="size-3.5" />
                              </Button>
                            )}
                            {canManage && m.status === "sent" && (
                              <Button size="sm" variant="ghost" disabled={pending} title="Stop mailing this address"
                                onClick={() => act(() => suppressAction(m.to, "manual"), `${m.to} suppressed.`)}>
                                <Ban className="size-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ClientPagination page={paged.page} pages={paged.pages} total={paged.total}
                pageSize={paged.pageSize} onPage={paged.setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldOff className="size-4" /> Suppression list ({suppressions.length})
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Addresses we never mail: hard bounces, complaints and opt-outs. Continuing to mail a dead
            address is how a sending domain's reputation dies.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Input value={suppressEmail} onChange={(e) => setSuppressEmail(e.target.value)} type="email"
                placeholder="Add an address" className="max-w-sm" />
              <Button variant="outline" disabled={pending || !suppressEmail}
                onClick={() => act(async () => {
                  const r = await suppressAction(suppressEmail, "manual");
                  setSuppressEmail("");
                  return r;
                }, "Added to the suppression list.")}>
                <Ban className="size-3.5" /> Suppress
              </Button>
            </div>
          )}

          {suppressions.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Check className="size-4 text-emerald-600" /> Nothing suppressed.
            </p>
          ) : (
            <div className="divide-y">
              {suppressions.map((s) => (
                <div key={s.email} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{s.email}</div>
                    <div className="text-muted-foreground text-xs">
                      {s.reason}{s.detail ? ` · ${s.detail}` : ""} · {when(s.createdAt)}
                    </div>
                  </div>
                  {canManage && (
                    <Button size="sm" variant="ghost" disabled={pending}
                      onClick={() => act(() => unsuppressAction(s.email), `${s.email} can be mailed again.`)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
