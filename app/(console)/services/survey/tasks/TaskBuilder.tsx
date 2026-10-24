"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, Loader2, Save, Rocket, ClipboardList, UserPlus,
  Smartphone, Boxes, PlayCircle, Zap, Share2, Lock, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTaskAction } from "./actions";
import type { QuestionInput, TaskInput } from "@/lib/sdk/survey";

/**
 * Mirrors survey/lib/task-types.ts. Kept as plain data here because this is a
 * client component and that module is server-side.
 */
const KINDS = [
  { kind: "survey", label: "Survey", Icon: ClipboardList, blurb: "Answer a set of questions.",
    defaults: { points: 120, xp: 40, minutes: 4, dwell: 45, auto: true }, needsQuestions: true },
  { kind: "referral", label: "Referral", Icon: UserPlus, blurb: "Invite someone who signs up and stays.",
    defaults: { points: 1500, xp: 400, minutes: 5, dwell: 0, auto: false }, needsQuestions: false },
  { kind: "app_install", label: "Install an app", Icon: Smartphone, blurb: "Install a partner app and use it.",
    defaults: { points: 800, xp: 200, minutes: 10, dwell: 0, auto: false }, needsQuestions: false },
  { kind: "software", label: "Try our software", Icon: Boxes, blurb: "Use a Spurs product and report back.",
    defaults: { points: 900, xp: 250, minutes: 15, dwell: 120, auto: false }, needsQuestions: true },
  { kind: "watch_ad", label: "Watch an ad", Icon: PlayCircle, blurb: "Watch a sponsored clip through.",
    defaults: { points: 25, xp: 8, minutes: 1, dwell: 30, auto: true }, needsQuestions: false },
  { kind: "action", label: "Do something", Icon: Zap, blurb: "Fund a wallet, pay, finish KYC.",
    defaults: { points: 2000, xp: 600, minutes: 5, dwell: 0, auto: false }, needsQuestions: false },
  { kind: "social", label: "Social", Icon: Share2, blurb: "Follow, share or review.",
    defaults: { points: 150, xp: 50, minutes: 2, dwell: 0, auto: false }, needsQuestions: false },
];

/**
 * Only actions another service can actually confirm. Each is checked against
 * the moment the user started the task, so pre-existing activity never pays.
 */
const ACTION_REFS = [
  { ref: "wallet.deposit", label: "Fund your wallet", by: "Wallet · a new deposit only" },
  { ref: "wallet.convert", label: "Convert between assets", by: "Wallet · a new conversion" },
  { ref: "wallet.crypto_wallet", label: "Create a crypto wallet", by: "Wallet · a newly created wallet" },
  { ref: "pay.first_payment", label: "Make a payment", by: "Pay · a new live payment" },
  { ref: "accounts.kyc_tier2", label: "Verify your identity", by: "Accounts · tier 2 approved after starting" },
  { ref: "baas.first_project", label: "Create your first project", by: "Developer platform · a new project" },
];

const LEVEL_NAME = ["", "Rookie", "Bronze", "Silver", "Gold", "Elite"];

const QUESTION_TYPES = [
  { type: "single_choice", label: "One choice" },
  { type: "multi_choice", label: "Multiple choices" },
  { type: "text", label: "Free text" },
  { type: "rating", label: "Rating 1–5" },
] as const;

const blankQuestion = (): QuestionInput => ({
  prompt: "", type: "single_choice", options: ["", ""], required: true,
});

export interface Existing {
  id: string;
  task: Record<string, any>;
  questions: QuestionInput[];
  responses: number;
}

export default function TaskBuilder({ existing }: { existing?: Existing }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const t = existing?.task;
  const locked = (existing?.responses ?? 0) > 0;

  const [kind, setKind] = useState<string>(t?.kind ?? "survey");
  const [title, setTitle] = useState(t?.title ?? "");
  const [description, setDescription] = useState(t?.description ?? "");
  const [points, setPoints] = useState(String(t?.points ?? 120));
  const [xp, setXp] = useState(String(t?.xp ?? 40));
  const [minutes, setMinutes] = useState(String(t?.estimatedMinutes ?? 4));
  const [dwell, setDwell] = useState(String(t?.dwellSeconds ?? 45));
  const [minLevel, setMinLevel] = useState(String(t?.minLevel ?? 1));
  const [maxSubs, setMaxSubs] = useState(t?.maxSubmissions ? String(t.maxSubmissions) : "");
  const [repeatHours, setRepeatHours] = useState(t?.repeatHours ? String(t.repeatHours) : "");
  const [autoApprove, setAutoApprove] = useState<boolean>(t?.autoApprove ?? true);
  const [actionRef, setActionRef] = useState(t?.actionRef ?? "");
  const [targetUrl, setTargetUrl] = useState(t?.targetUrl ?? "");
  const [questions, setQuestions] = useState<QuestionInput[]>(existing?.questions ?? [blankQuestion()]);

  const spec = KINDS.find((k) => k.kind === kind) ?? KINDS[0];

  /** Switching kind reapplies that kind's sensible defaults, but never clobbers the title. */
  const pickKind = (k: (typeof KINDS)[number]) => {
    setKind(k.kind);
    setPoints(String(k.defaults.points));
    setXp(String(k.defaults.xp));
    setMinutes(String(k.defaults.minutes));
    setDwell(String(k.defaults.dwell));
    setAutoApprove(k.defaults.auto);
    if (!k.needsQuestions && questions.length === 1 && !questions[0].prompt) setQuestions([]);
    if (k.needsQuestions && questions.length === 0) setQuestions([blankQuestion()]);
  };

  const setQ = (i: number, patch: Partial<QuestionInput>) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const save = (status: "draft" | "live") =>
    start(async () => {
      setError(null);
      const input: TaskInput = {
        title, description: description || null, kind,
        points: Number(points) || 0,
        xp: Number(xp) || 0,
        estimatedMinutes: Number(minutes) || 1,
        dwellSeconds: Number(dwell) || 0,
        minLevel: Number(minLevel) || 1,
        maxSubmissions: maxSubs ? Number(maxSubs) : null,
        repeatHours: repeatHours ? Number(repeatHours) : null,
        autoApprove,
        status,
        actionRef: actionRef || null,
        targetUrl: targetUrl || null,
      };
      const res = await saveTaskAction(existing?.id ?? null, input, questions);
      if (res.ok) router.push("/services/survey/tasks");
      else setError(res.error);
    });

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {locked && (
        <div className="text-muted-foreground bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <p>
            {existing!.responses} {existing!.responses === 1 ? "person has" : "people have"} answered this task,
            so the reward and the questions are frozen — changing them would rewrite the deal they already accepted.
            You can still edit the copy, the level gate and the status.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What should people do?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" onClick={() => pickKind(k)} disabled={locked}
              className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                kind === k.kind ? "border-primary bg-primary/5" : "hover:border-primary/40"
              }`}>
              <k.Icon className={`size-4 ${kind === k.kind ? "text-primary" : "text-muted-foreground"}`} />
              <div className="mt-2 text-sm font-medium">{k.label}</div>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{k.blurb}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How do you send money to family?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What this is about, and anything they need to know before starting." />
          </div>

          {kind === "action" && (
            <div className="space-y-1.5">
              <Label htmlFor="actionRef">Verified against</Label>
              <select id="actionRef" value={actionRef} onChange={(e) => setActionRef(e.target.value)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                <option value="">Choose the platform action…</option>
                {ACTION_REFS.map((a) => <option key={a.ref} value={a.ref}>{a.label}</option>)}
              </select>
              <p className="text-muted-foreground text-xs">
                {actionRef
                  ? `Checked by ${ACTION_REFS.find((a) => a.ref === actionRef)?.by}.`
                  : "The task only pays once the owning service confirms it — and only for activity after the user starts the task, so an existing balance never counts."}
              </p>
            </div>
          )}

          {(kind === "app_install" || kind === "watch_ad" || kind === "social" || kind === "referral") && (
            <div className="space-y-1.5">
              <Label htmlFor="targetUrl">Link</Label>
              <Input id="targetUrl" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://…" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reward and rules</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Points are money; XP is level progress. A user's level multiplier is applied on top of the points here.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="points">Points</Label>
            <Input id="points" value={points} disabled={locked} inputMode="numeric"
              onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xp">XP</Label>
            <Input id="xp" value={xp} disabled={locked} inputMode="numeric"
              onChange={(e) => setXp(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="minutes">Takes about (minutes)</Label>
            <Input id="minutes" value={minutes} inputMode="numeric"
              onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dwell">Minimum time (seconds)</Label>
            <Input id="dwell" value={dwell} inputMode="numeric"
              onChange={(e) => setDwell(e.target.value.replace(/\D/g, ""))} />
            <p className="text-muted-foreground text-xs">Submitting faster than this trips anti-cheat.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="minLevel">Minimum level</Label>
            <select id="minLevel" value={minLevel} onChange={(e) => setMinLevel(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>Level {l} · {LEVEL_NAME[l]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxSubs">Response cap</Label>
            <Input id="maxSubs" value={maxSubs} inputMode="numeric" placeholder="Unlimited"
              onChange={(e) => setMaxSubs(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repeat">Repeatable every (hours)</Label>
            <Input id="repeat" value={repeatHours} inputMode="numeric" placeholder="One time only"
              onChange={(e) => setRepeatHours(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label>Approval</Label>
            <label className="flex h-9 items-center gap-2 text-sm">
              <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)}
                className="size-4" />
              Pay automatically
            </label>
            <p className="text-muted-foreground text-xs">Flagged submissions still go to review.</p>
          </div>
        </CardContent>
      </Card>

      {(spec.needsQuestions || questions.length > 0) && (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Vary the answer options — anti-cheat flags people who pick the same position every time.
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={locked}
              onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
              <Plus className="size-3.5" /> Add question
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">No questions on this task.</p>
            )}

            {questions.map((q, i) => (
              <div key={i} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-start gap-2">
                  <GripVertical className="text-muted-foreground mt-2.5 size-4 shrink-0" />
                  <Input value={q.prompt} disabled={locked} placeholder={`Question ${i + 1}`}
                    onChange={(e) => setQ(i, { prompt: e.target.value })} />
                  <Button size="sm" variant="ghost" disabled={locked}
                    onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5 text-red-600" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pl-6">
                  <select value={q.type} disabled={locked}
                    onChange={(e) => setQ(i, {
                      type: e.target.value as QuestionInput["type"],
                      options: e.target.value.includes("choice") ? (q.options.length ? q.options : ["", ""]) : [],
                    })}
                    className="border-input bg-background h-8 rounded-md border px-2 text-sm">
                    {QUESTION_TYPES.map((qt) => <option key={qt.type} value={qt.type}>{qt.label}</option>)}
                  </select>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={q.required} disabled={locked}
                      onChange={(e) => setQ(i, { required: e.target.checked })} className="size-4" />
                    Required
                  </label>
                </div>

                {q.type.includes("choice") && (
                  <div className="space-y-2 pl-6">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input value={opt} disabled={locked} placeholder={`Option ${oi + 1}`}
                          onChange={(e) => setQ(i, {
                            options: q.options.map((o, oj) => (oj === oi ? e.target.value : o)),
                          })} />
                        <Button size="sm" variant="ghost" disabled={locked || q.options.length <= 2}
                          onClick={() => setQ(i, { options: q.options.filter((_, oj) => oj !== oi) })}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" disabled={locked}
                      onClick={() => setQ(i, { options: [...q.options, ""] })}>
                      <Plus className="size-3.5" /> Add option
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save("live")} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          {existing ? "Save and publish" : "Publish"}
        </Button>
        <Button variant="outline" onClick={() => save("draft")} disabled={pending}>
          <Save className="size-4" /> Save as draft
        </Button>
        <Badge variant="outline" className="gap-1.5">
          <Info className="size-3" />
          Level {minLevel}+ · {points || 0} pts · {xp || 0} XP
        </Badge>
      </div>
    </div>
  );
}
