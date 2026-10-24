"use client";

import { useState, useTransition } from "react";
import {
  CreditCard,
  Check,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Webhook,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProviderState } from "@/lib/pay-providers";
import { setProcessorAction } from "../actions";
import { saveProviderAction, refreshWebhookAction } from "./actions";

interface Draft {
  values: Record<string, string>;
  feePercent: string;
  feeFlat: string;
  webhookUrl: string;
}

export default function ProvidersManager({
  providers,
  current,
  canEdit,
}: {
  providers: ProviderState[];
  current: string;
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState(() => {
    if (providers.some((p) => p.id === current)) return current;
    return providers[0]?.id ?? "";
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      providers.map((p) => [
        p.id,
        {
          values: { ...p.values },
          feePercent: p.feePercent,
          feeFlat: p.feeFlat,
          webhookUrl: p.webhookUrl,
        },
      ]),
    ),
  );
  const [activating, startActivate] = useTransition();

  const sel = providers.find((p) => p.id === selected) ?? providers[0]!;
  const draft = drafts[sel.id] ?? drafts[selected];
  const setDraft = (patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [sel.id]: { ...d[sel.id], ...patch } }));

  const makeLive = (id: string) =>
    startActivate(async () => {
      const fd = new FormData();
      fd.set("provider", id);
      await setProcessorAction(fd);
    });

  return (
    <div className="space-y-6">
      {/* Provider chooser */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((p) => {
          const active = current === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected === p.id
                  ? "border-primary ring-primary/30 ring-2"
                  : "hover:border-foreground/30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg">
                  <CreditCard className="size-4" />
                </span>
                {active ? (
                  <Badge variant="success">Live</Badge>
                ) : (
                  canEdit && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        makeLive(p.id);
                      }}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      Set live
                    </span>
                  )
                )}
              </div>
              <div className="mt-2 text-sm font-medium">{p.label}</div>
              <div className="text-muted-foreground text-xs">{p.note}</div>
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{sel.label}</CardTitle>
            {current === sel.id && <Badge variant="success">Live</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {!canEdit ? (
            <p className="text-muted-foreground text-sm">
              Only a superadmin can edit providers.
            </p>
          ) : sel.sandbox ? (
            <p className="text-muted-foreground text-sm">
              Sandbox simulates payments — no credentials, fees or webhooks to
              configure.
            </p>
          ) : (
            <ProviderEditor
              key={sel.id}
              provider={sel}
              draft={draft}
              setDraft={setDraft}
              onWebhookUrl={(url) => setDraft({ webhookUrl: url })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderEditor({
  provider,
  draft,
  setDraft,
  onWebhookUrl,
}: {
  provider: ProviderState;
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  onWebhookUrl: (url: string) => void;
}) {
  const [pending, startSave] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = () =>
    startSave(async () => {
      setMsg(null);
      const res = await saveProviderAction({
        provider: provider.id,
        values: draft.values,
        feePercent: draft.feePercent,
        feeFlat: draft.feeFlat,
      });
      setMsg(
        res.ok
          ? { ok: true, text: "Provider saved." }
          : { ok: false, text: res.error },
      );
    });

  const refresh = () =>
    startRefresh(async () => {
      setMsg(null);
      const res = await refreshWebhookAction(provider.id);
      if (res.ok) {
        onWebhookUrl(res.url);
        setMsg({
          ok: true,
          text: "Webhook URL generated — paste it into the provider dashboard.",
        });
      } else setMsg({ ok: false, text: res.error });
    });

  const copy = () => {
    navigator.clipboard.writeText(draft.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Credentials */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Credentials</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {provider.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <div className="relative">
                <Input
                  id={f.key}
                  type={f.secret && !reveal[f.key] ? "password" : "text"}
                  value={draft.values[f.key] ?? ""}
                  placeholder={f.placeholder ?? ""}
                  onChange={(e) =>
                    setDraft({
                      values: { ...draft.values, [f.key]: e.target.value },
                    })
                  }
                  className={f.secret ? "pr-9 font-mono" : "font-mono"}
                />
                {f.secret && (
                  <button
                    type="button"
                    onClick={() =>
                      setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))
                    }
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    {reveal[f.key] ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit fee */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Deposit fee</h3>
        <p className="text-muted-foreground -mt-2 text-xs">
          Charged on money collected through this provider.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="feePercent">Percentage (%)</Label>
            <Input
              id="feePercent"
              inputMode="decimal"
              value={draft.feePercent}
              placeholder="1.5"
              onChange={(e) => setDraft({ feePercent: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feeFlat">Flat fee (₦)</Label>
            <Input
              id="feeFlat"
              inputMode="decimal"
              value={draft.feeFlat}
              placeholder="0"
              onChange={(e) => setDraft({ feeFlat: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Webhook */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Webhook className="size-4" /> Provider webhook
        </h3>
        <p className="text-muted-foreground -mt-1 text-xs">
          The URL this provider should call. Generate it here and paste it into
          the provider's dashboard. Refresh rotates the secret.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            readOnly
            value={draft.webhookUrl || "Not generated yet"}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copy}
            disabled={!draft.webhookUrl}
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}{" "}
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {draft.webhookUrl ? "Refresh" : "Generate"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t pt-4">
        <Button onClick={save} disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Zap className="size-4" />
          )}{" "}
          Save provider
        </Button>
        {msg && (
          <span
            className={
              "text-xs " +
              (msg.ok
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive")
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
