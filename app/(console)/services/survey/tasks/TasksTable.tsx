"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Pencil, Play, Pause, Archive, Trash2, Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setTaskStatusAction, deleteTaskAction } from "./actions";
import ClientPagination, { usePaged } from "@/components/ClientPagination";

export interface TaskRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  points: number;
  xp: number;
  minLevel: number;
  ownerType: string;
  autoApprove: boolean;
  submissions: number;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  live: "default", draft: "secondary", paused: "outline", closed: "outline",
};

export default function TasksTable({ rows }: { rows: TaskRow[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = q
    ? rows.filter((r) => [r.title, r.kind].some((v) => v.toLowerCase().includes(q.toLowerCase())))
    : rows;
  const paged = usePaged(filtered, 25);

  const setStatus = (id: string, status: "draft" | "live" | "paused" | "closed") =>
    start(async () => {
      setError(null);
      const res = await setTaskStatusAction(id, status);
      if (!res.ok) setError(res.error);
    });

  const remove = (r: TaskRow) =>
    start(async () => {
      setError(null);
      const res = await deleteTaskAction(r.id);
      if (!res.ok) setError(res.error);
    });

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Tasks ({rows.length})</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Live tasks appear in the Earn app immediately, to everyone at or above the level gate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="max-w-48" />
            <Link href="/services/survey/tasks/new">
              <Button size="sm"><Plus className="size-3.5" /> New task</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="bg-muted grid size-12 place-items-center rounded-full">
                <ClipboardList className="text-muted-foreground size-5" />
              </span>
              <p className="mt-4 text-sm font-medium">{rows.length === 0 ? "No tasks yet" : "Nothing matched"}</p>
              {rows.length === 0 && (
                <>
                  <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                    Create the first one — a short survey is the usual place to start.
                  </p>
                  <Link href="/services/survey/tasks/new" className="mt-4">
                    <Button size="sm"><Plus className="size-3.5" /> New task</Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="px-5 py-2 font-medium">Task</th>
                    <th className="px-5 py-2 font-medium">Type</th>
                    <th className="px-5 py-2 font-medium">Reward</th>
                    <th className="px-5 py-2 font-medium">Gate</th>
                    <th className="px-5 py-2 font-medium">Responses</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.slice.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-muted-foreground text-xs">
                          {r.ownerType === "platform" ? "Spurs" : "Business"}
                          {r.autoApprove ? " · auto-pays" : " · reviewed"}
                        </div>
                      </td>
                      <td className="px-5 py-2.5 capitalize">{r.kind.replace(/_/g, " ")}</td>
                      <td className="px-5 py-2.5 tabular-nums">
                        {r.points.toLocaleString()} pts
                        <span className="text-muted-foreground"> · {r.xp.toLocaleString()} XP</span>
                      </td>
                      <td className="px-5 py-2.5">
                        {r.minLevel > 1 ? <Badge variant="secondary">Level {r.minLevel}+</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums">{r.submissions.toLocaleString()}</td>
                      <td className="px-5 py-2.5">
                        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">{r.status}</Badge>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Link href={`/services/survey/tasks/${r.id}`}>
                            <Button size="sm" variant="ghost" title="Edit"><Pencil className="size-3.5" /></Button>
                          </Link>
                          {r.status === "live" ? (
                            <Button size="sm" variant="ghost" title="Pause" disabled={pending}
                              onClick={() => setStatus(r.id, "paused")}>
                              <Pause className="size-3.5" />
                            </Button>
                          ) : r.status !== "closed" && (
                            <Button size="sm" variant="ghost" title="Publish" disabled={pending}
                              onClick={() => setStatus(r.id, "live")}>
                              <Play className="size-3.5 text-emerald-600" />
                            </Button>
                          )}
                          {r.submissions > 0 ? (
                            r.status !== "closed" && (
                              <Button size="sm" variant="ghost" title="Close" disabled={pending}
                                onClick={() => setStatus(r.id, "closed")}>
                                <Archive className="size-3.5" />
                              </Button>
                            )
                          ) : (
                            <Button size="sm" variant="ghost" title="Delete" disabled={pending}
                              onClick={() => remove(r)}>
                              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-red-600" />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ClientPagination page={paged.page} pages={paged.pages} total={paged.total}
                pageSize={paged.pageSize} onPage={paged.setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
