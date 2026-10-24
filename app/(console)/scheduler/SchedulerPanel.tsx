"use client";

import { useState, useTransition } from "react";
import { Play, Loader2, Check, X, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runJobAction, toggleJobAction, setIntervalAction } from "./actions";

export interface JobRow {
  key: string;
  label: string;
  description: string | null;
  intervalSeconds: number;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string;
  lastError: string | null;
  lastResult: string | null;
  lastDurationMs: number;
  nextRunAt: string;
  failures: number;
  runs: number;
}

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const until = (iso: string) => {
  const secs = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (secs <= 0) return "due now";
  if (secs < 60) return `in ${secs}s`;
  if (secs < 3600) return `in ${Math.floor(secs / 60)}m`;
  return `in ${Math.floor(secs / 3600)}h`;
};

const every = (seconds: number) => {
  if (seconds < 60) return `every ${seconds}s`;
  if (seconds < 3600) return `every ${Math.round(seconds / 60)}m`;
  return `every ${Math.round(seconds / 3600)}h`;
};

export default function SchedulerPanel({ jobs }: { jobs: JobRow[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [intervals, setIntervals] = useState<Record<string, string>>(
    Object.fromEntries(jobs.map((j) => [j.key, String(j.intervalSeconds)])),
  );

  const run = (key: string) =>
    start(async () => {
      setBusy(key); setNote(null);
      const res = await runJobAction(key);
      setBusy(null);
      setNote({ ok: res.ok, text: `${key}: ${res.summary}` });
    });

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setNote(null);
      const res = await fn();
      if (!res.ok) setNote({ ok: false, text: res.error ?? "Action failed" });
    });

  return (
    <div className="space-y-4">
      {note && (
        <p className={`text-sm ${note.ok ? "text-emerald-600" : "text-red-600"}`}>{note.text}</p>
      )}

      {jobs.map((job) => {
        const failing = job.failures > 0;
        const overdue = job.enabled && new Date(job.nextRunAt).getTime() < Date.now() - 300_000;

        return (
          <Card key={job.key} className={failing ? "border-red-500/40" : ""}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {job.label}
                  {!job.enabled && <Badge variant="outline">paused</Badge>}
                  {failing && (
                    <Badge variant="destructive">
                      {job.failures} failure{job.failures === 1 ? "" : "s"} in a row
                    </Badge>
                  )}
                  {overdue && !failing && (
                    <Badge variant="outline" className="text-amber-600">overdue</Badge>
                  )}
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">{job.description}</p>
              </div>

              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1.5 text-sm">
                  {job.lastStatus === "ok" && <Check className="size-3.5 text-emerald-600" />}
                  {job.lastStatus === "failed" && <X className="size-3.5 text-red-600" />}
                  {job.lastStatus === "running" && <Loader2 className="size-3.5 animate-spin" />}
                  {job.lastStatus === "never" && <Clock className="text-muted-foreground size-3.5" />}
                  <span className="text-muted-foreground">{ago(job.lastRunAt)}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {job.enabled ? until(job.nextRunAt) : "paused"} · {job.runs} runs
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {job.lastResult && job.lastStatus === "ok" && (
                <p className="text-muted-foreground text-sm">
                  Last run: {job.lastResult}
                  <span className="text-xs"> ({job.lastDurationMs}ms)</span>
                </p>
              )}
              {job.lastError && (
                <p className="text-sm text-red-600">Last error: {job.lastError}</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(job.key)}>
                  {busy === job.key && pending
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Play className="size-3.5" />}
                  Run now
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => act(() => toggleJobAction(job.key, !job.enabled))}
                >
                  {job.enabled ? "Pause" : "Resume"}
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{every(job.intervalSeconds)}</span>
                  <Input
                    value={intervals[job.key] ?? ""}
                    onChange={(e) =>
                      setIntervals((i) => ({ ...i, [job.key]: e.target.value.replace(/\D/g, "") }))
                    }
                    className="h-8 w-24"
                    inputMode="numeric"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || !intervals[job.key]}
                    onClick={() => act(() => setIntervalAction(job.key, Number(intervals[job.key])))}
                  >
                    Set seconds
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {jobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="text-muted-foreground size-5" />
            <p className="mt-3 text-sm font-medium">No jobs registered</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Jobs are defined in <code>lib/scheduler/jobs.ts</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
