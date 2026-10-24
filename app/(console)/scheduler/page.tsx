import { Timer, TriangleAlert, Check, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { listJobs, health } from "@/lib/scheduler";
import SchedulerPanel, { type JobRow } from "./SchedulerPanel";

export const dynamic = "force-dynamic";

export default async function Scheduler() {
  await requirePermission("platform.scheduler.read");
  const [jobs, pulse] = await Promise.all([listJobs(), health()]);

  const tiles = [
    { label: "Jobs", value: jobs.length },
    { label: "Running", value: jobs.filter((j) => j.enabled).length },
    { label: "Failing", value: pulse.failing },
    { label: "Overdue", value: pulse.overdue },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scheduler</h1>
        <p className="text-muted-foreground text-sm">
          Work that has to happen on a timer — releasing held payouts, settling trades, retrying mail.
        </p>
      </div>

      {/* The failure that hides: if the ticker is dead every job looks fine,
          because none of them ran. Say so before anything else. */}
      {pulse.stalled ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div className="text-muted-foreground">
            <strong className="text-foreground">The scheduler isn't running.</strong>{" "}
            {pulse.lastTickAt
              ? `Nothing has ticked for ${Math.floor((pulse.secondsSinceTick ?? 0) / 60)} minutes.`
              : "It has never ticked."}{" "}
            Nothing below is happening on its own — approved payouts and gift card trades will sit
            until someone presses "Run now".
            <p className="mt-2">
              Start it with <code className="bg-muted rounded px-1 py-0.5">npm run scheduler</code> in{" "}
              <code className="bg-muted rounded px-1 py-0.5">admin/</code>, or point a cron at{" "}
              <code className="bg-muted rounded px-1 py-0.5">POST /api/private/scheduler/tick</code>{" "}
              once a minute.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            Ticking normally — last {pulse.secondsSinceTick}s ago, {pulse.ticks.toLocaleString()} ticks
            so far.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-6">
              <div className="text-muted-foreground text-sm">{t.label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SchedulerPanel
        jobs={jobs.map((j): JobRow => ({
          key: j.key,
          label: j.label,
          description: j.description,
          intervalSeconds: j.intervalSeconds,
          enabled: j.enabled,
          lastRunAt: j.lastRunAt ? j.lastRunAt.toISOString() : null,
          lastStatus: j.lastStatus,
          lastError: j.lastError,
          lastResult: j.lastResult,
          lastDurationMs: j.lastDurationMs,
          nextRunAt: j.nextRunAt.toISOString(),
          failures: j.failures,
          runs: j.runs,
        }))}
      />

      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Every job is safe to run twice — the scheduler guarantees at-least-once, never
          exactly-once. Failures back off automatically and recover on their own once the service
          they depend on is back.
        </p>
      </div>
    </div>
  );
}
