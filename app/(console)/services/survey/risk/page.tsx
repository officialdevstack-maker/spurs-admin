import { ShieldAlert, Timer, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page/PageHeader";
import Pagination from "@/components/Pagination";
import { requirePermission } from "@/lib/auth";
import { survey } from "@/lib/sdk/survey";
import { RiskBadge, SIGNAL_LABEL } from "../review/ReviewQueue";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const when = (s: string) =>
  new Date(s).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const ACTION_TONE: Record<string, string> = {
  flagged: "text-amber-600",
  rejected: "text-red-600",
  restricted: "text-red-600",
  banned: "text-red-600",
};

export default async function Risk({ searchParams }: { searchParams: Promise<{ page?: string; log?: string }> }) {
  await requirePermission("ops.fraud.read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const logPage = Math.max(1, Number(sp.log) || 1);

  const [flagged, events] = await Promise.all([survey.flagged(), survey.riskEvents()]);

  const flaggedPage = flagged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const eventsPage = events.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);

  const bySignal = flagged
    .flatMap((f) => f.riskSignals ?? [])
    .reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
  const top = Object.entries(bySignal).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title="Earn risk" description="Review flagged submissions and the automated enforcement history." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Flagged submissions</span>
              <ShieldAlert className="text-muted-foreground size-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{flagged.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Enforcement events</span>
              <Ban className="text-muted-foreground size-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{events.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Rejected outright</span>
              <Timer className="text-muted-foreground size-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {flagged.filter((f) => f.status === "rejected").length.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {top.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What&apos;s tripping the checks</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Signals are weak on their own — a submission is only actioned on the combined score.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {top.map(([signal, count]) => (
              <Badge key={signal} variant="secondary" className="gap-1.5">
                {SIGNAL_LABEL[signal] ?? signal.replace(/_/g, " ")}
                <span className="tabular-nums opacity-70">{count}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flagged submissions</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {flagged.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Nothing flagged.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="px-5 py-2 font-medium">User</th>
                    <th className="px-5 py-2 font-medium">Task</th>
                    <th className="px-5 py-2 font-medium">Score</th>
                    <th className="px-5 py-2 font-medium">Signals</th>
                    <th className="px-5 py-2 font-medium">Time</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {flaggedPage.map((f) => (
                    <tr key={f.id}>
                      <td className="px-5 py-2.5">{f.name ?? f.userId}</td>
                      <td className="max-w-[16rem] truncate px-5 py-2.5">{f.title}</td>
                      <td className="px-5 py-2.5"><RiskBadge score={f.riskScore} /></td>
                      <td className="px-5 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(f.riskSignals ?? []).map((s) => (
                            <span key={s} className="bg-muted rounded px-1.5 py-0.5 text-[11px]">
                              {SIGNAL_LABEL[s] ?? s.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-muted-foreground px-5 py-2.5 tabular-nums">
                        {f.durationSeconds !== null ? `${f.durationSeconds}s` : "—"}
                      </td>
                      <td className="px-5 py-2.5 capitalize">{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5">
                <Pagination page={page} pageSize={PAGE_SIZE} total={flagged.length}
                  basePath="/services/survey/risk" params={{ log: sp.log }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enforcement log</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Every automated and manual decision, so any of them can be audited or reversed.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Nothing logged yet.</p>
          ) : eventsPage.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 border-b px-5 py-3 text-sm last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.name ?? e.userId}</span>
                  <Badge variant="outline" className={`text-xs capitalize ${ACTION_TONE[e.action] ?? ""}`}>
                    {e.action}
                  </Badge>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {SIGNAL_LABEL[e.kind] ?? e.kind.replace(/_/g, " ")}
                  {typeof e.detail?.label === "string" ? ` — ${e.detail.label}` : ""}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">{when(e.createdAt)}</span>
            </div>
          ))}
          <div className="px-5">
            <Pagination page={logPage} pageSize={PAGE_SIZE} total={events.length} paramName="log"
              basePath="/services/survey/risk" params={{ page: sp.page }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
