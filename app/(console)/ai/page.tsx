import { Sparkles, TriangleAlert, Check, Info, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePermission, can } from "@/lib/auth";
import { aiSettings, aiHealth, usageStats, recentFailures, AI_PROVIDERS } from "@/lib/ai";
import { saveAiAction } from "./actions";
import AiPanel from "./AiPanel";

export const dynamic = "force-dynamic";

const when = (d: Date) =>
  new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AiSettings() {
  await requirePermission("platform.ai.read");

  const [settings, health, usage, failures, canManage] = await Promise.all([
    aiSettings(), aiHealth(), usageStats(30), recentFailures(10), can("platform.ai.manage"),
  ]);

  const provider = AI_PROVIDERS.find((p) => p.id === settings.provider) ?? AI_PROVIDERS[0];
  const needsKey = provider.requires.includes("AI_API_KEY");

  const tiles = [
    { label: "Calls, 30 days", value: usage.calls.toLocaleString() },
    { label: "Tokens in", value: usage.tokensIn.toLocaleString() },
    { label: "Tokens out", value: usage.tokensOut.toLocaleString() },
    { label: "Average latency", value: `${usage.avgLatency} ms` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI</h1>
        <p className="text-muted-foreground text-sm">
          One model provider, one key, one usage log — shared by every Spurs app.
        </p>
      </div>

      {/* Say plainly whether anything is actually being generated. */}
      {health.isOffline ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">No model is connected.</strong> Callers get a canned
            reply — support's assistant will hand every question to a human. Choose a provider below.
          </p>
        </div>
      ) : !health.ready ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">{provider.name} isn't configured.</strong> Missing:{" "}
            {health.missing.join(", ")}.
          </p>
        </div>
      ) : !health.enabled ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">AI is switched off. Callers are refused cleanly.</p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            Running on <strong className="text-foreground">{provider.name}</strong> ({health.model}).
            {settings.dailyTokenBudget > 0 && (
              <> {usage.today.toLocaleString()} of {settings.dailyTokenBudget.toLocaleString()} tokens used today.</>
            )}
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

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" /> Configuration
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Held encrypted in the platform credential store. No app carries a model key in its own
              environment.
            </p>
          </CardHeader>
          <CardContent>
            <form action={saveAiAction} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="AI_PROVIDER">Provider</Label>
                  <select
                    id="AI_PROVIDER"
                    name="AI_PROVIDER"
                    defaultValue={settings.provider}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  >
                    {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <p className="text-muted-foreground text-xs">Save to reveal that provider's fields.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="AI_MODEL">Model</Label>
                  <Input id="AI_MODEL" name="AI_MODEL" defaultValue={settings.config.AI_MODEL ?? ""}
                    placeholder={provider.defaultModel} />
                </div>

                {needsKey && (
                  <div className="space-y-1.5">
                    <Label htmlFor="AI_API_KEY">API key</Label>
                    <Input id="AI_API_KEY" name="AI_API_KEY" type="password"
                      placeholder={settings.config.AI_API_KEY ? "•••••••• (leave blank to keep)" : "Paste the key"} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="AI_MAX_TOKENS">Max tokens per reply</Label>
                  <Input id="AI_MAX_TOKENS" name="AI_MAX_TOKENS"
                    defaultValue={String(settings.maxTokens)} inputMode="numeric" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="AI_DAILY_TOKEN_BUDGET">Daily token budget</Label>
                  <Input id="AI_DAILY_TOKEN_BUDGET" name="AI_DAILY_TOKEN_BUDGET"
                    defaultValue={String(settings.dailyTokenBudget)} inputMode="numeric" />
                  <p className="text-muted-foreground text-xs">
                    0 means no limit. Past it, callers are refused rather than billed.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="AI_ENABLED" defaultChecked={settings.enabled} className="size-4" />
                  AI is switched on
                </label>
                <Button type="submit">Save configuration</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <AiPanel canManage={canManage} />

      {usage.byApp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" /> What's using it
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">Last 30 days.</p>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="px-6 py-2 font-medium">App</th>
                    <th className="px-6 py-2 font-medium">Purpose</th>
                    <th className="px-6 py-2 font-medium">Calls</th>
                    <th className="px-6 py-2 font-medium">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usage.byApp.map((row) => (
                    <tr key={`${row.app}:${row.purpose}`}>
                      <td className="px-6 py-2.5 font-medium">{row.app}</td>
                      <td className="text-muted-foreground px-6 py-2.5">{row.purpose}</td>
                      <td className="px-6 py-2.5 tabular-nums">{row.calls.toLocaleString()}</td>
                      <td className="px-6 py-2.5 tabular-nums">{row.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {failures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent failures ({usage.failed})</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {failures.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 border-b px-6 py-2.5 text-sm last:border-0">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{f.app}</span>
                  <span className="text-muted-foreground"> · {f.purpose}</span>
                  <div className="text-xs text-red-600">{f.error}</div>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{when(f.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Prompts stay with the app that owns the conversation — support's assistant needs a very
          different prompt from a fraud summariser. This page owns the provider, the key and the
          spend; the apps own what they ask.
        </p>
      </div>
    </div>
  );
}
