import { Mail, TriangleAlert, Check, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePermission, can } from "@/lib/auth";
import { getMailSettings, mailHealth, PROVIDERS } from "@/lib/mail/settings";
import { recentMail, mailStats, listSuppressions } from "@/lib/mail/send";
import { TEMPLATES } from "@/lib/mail/templates";
import { saveMailAction } from "./actions";
import MailPanel, { type MailRow, type SuppressionRow } from "./MailPanel";

export const dynamic = "force-dynamic";

export default async function MailSettings() {
  await requirePermission("platform.mail.read");

  const [settings, health, log, stats, suppressions, canManage] = await Promise.all([
    getMailSettings(), mailHealth(), recentMail(200), mailStats(), listSuppressions(),
    can("platform.mail.manage"),
  ]);

  const provider = PROVIDERS.find((p) => p.id === settings.provider) ?? PROVIDERS[0];
  const needsSmtp = provider.requires.includes("MAIL_HOST");
  const needsApiKey = provider.requires.includes("MAIL_API_KEY");

  const tiles = [
    { label: "Sent", value: stats.sent },
    { label: "Failed", value: stats.failed },
    { label: "Suppressed", value: stats.suppressed },
    { label: "On the suppression list", value: stats.suppressionList },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mail</h1>
        <p className="text-muted-foreground text-sm">
          One provider, one set of templates, one log — for every Spurs app.
        </p>
      </div>

      {/* Say plainly whether mail actually works. */}
      {health.isDevelopmentOnly ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">Nothing is being delivered.</strong> The provider is set
            to log-only, which prints messages to the server log instead of sending them. Fine for
            development — choose a real provider below before launch.
          </p>
        </div>
      ) : !health.ready ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">{provider.name} isn't configured.</strong> Missing:{" "}
            {health.missing.join(", ")}. Mail will fail until these are set.
          </p>
        </div>
      ) : !health.enabled ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            Mail is switched off. Messages are logged as failed rather than sent.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            Sending through <strong className="text-foreground">{provider.name}</strong> as{" "}
            {settings.fromName} &lt;{settings.fromEmail}&gt;.
            {settings.redirectTo && (
              <> Everything is being redirected to <strong>{settings.redirectTo}</strong>.</>
            )}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-6">
              <div className="text-muted-foreground text-sm">{t.label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{t.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4" /> Configuration
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Held encrypted in the platform credential store — no app carries SMTP credentials in its
              own environment.
            </p>
          </CardHeader>
          <CardContent>
            <form action={saveMailAction} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="MAIL_PROVIDER">Provider</Label>
                  <select id="MAIL_PROVIDER" name="MAIL_PROVIDER" defaultValue={settings.provider}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                    {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <p className="text-muted-foreground text-xs">Save to reveal that provider's fields.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="MAIL_FROM">From address</Label>
                  <Input id="MAIL_FROM" name="MAIL_FROM" type="email" defaultValue={settings.fromEmail} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="MAIL_FROM_NAME">From name</Label>
                  <Input id="MAIL_FROM_NAME" name="MAIL_FROM_NAME" defaultValue={settings.fromName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="MAIL_REPLY_TO">Reply-to</Label>
                  <Input id="MAIL_REPLY_TO" name="MAIL_REPLY_TO" type="email" defaultValue={settings.replyTo}
                    placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="MAIL_APP_URL">Public app URL</Label>
                  <Input id="MAIL_APP_URL" name="MAIL_APP_URL" defaultValue={settings.appUrl} />
                  <p className="text-muted-foreground text-xs">Used to build links inside emails.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="MAIL_REDIRECT_TO">Redirect everything to</Label>
                  <Input id="MAIL_REDIRECT_TO" name="MAIL_REDIRECT_TO" type="email"
                    defaultValue={settings.redirectTo} placeholder="Staging safety valve" />
                  <p className="text-muted-foreground text-xs">
                    Set this on staging so tests never reach real customers.
                  </p>
                </div>
              </div>

              {needsSmtp && (
                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="MAIL_HOST">SMTP host</Label>
                    <Input id="MAIL_HOST" name="MAIL_HOST" defaultValue={settings.config.MAIL_HOST ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="MAIL_PORT">Port</Label>
                    <Input id="MAIL_PORT" name="MAIL_PORT" defaultValue={settings.config.MAIL_PORT ?? "587"} />
                    <p className="text-muted-foreground text-xs">465 for TLS, 587 for STARTTLS.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="MAIL_USERNAME">Username</Label>
                    <Input id="MAIL_USERNAME" name="MAIL_USERNAME" defaultValue={settings.config.MAIL_USERNAME ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="MAIL_PASSWORD">Password</Label>
                    <Input id="MAIL_PASSWORD" name="MAIL_PASSWORD" type="password"
                      placeholder={settings.config.MAIL_PASSWORD ? "•••••••• (leave blank to keep)" : "Password"} />
                  </div>
                </div>
              )}

              {needsApiKey && (
                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="MAIL_API_KEY">API key</Label>
                    <Input id="MAIL_API_KEY" name="MAIL_API_KEY" type="password"
                      placeholder={settings.config.MAIL_API_KEY ? "•••••••• (leave blank to keep)" : "Paste the key"} />
                  </div>
                  {provider.id === "postmark" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="MAIL_STREAM">Message stream</Label>
                      <Input id="MAIL_STREAM" name="MAIL_STREAM" defaultValue={settings.config.MAIL_STREAM ?? "outbound"} />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="MAIL_ENABLED" defaultChecked={settings.enabled} className="size-4" />
                  Mail is switched on
                </label>
                <Button type="submit">Save configuration</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <MailPanel
        canManage={canManage}
        log={log.map((m): MailRow => ({
          id: m.id, app: m.app, template: m.template, to: m.to, subject: m.subject,
          status: m.status, provider: m.provider, error: m.error, attempts: m.attempts,
          createdAt: m.createdAt.toISOString(),
        }))}
        suppressions={suppressions.map((s): SuppressionRow => ({
          email: s.email, reason: s.reason, detail: s.detail,
          createdAt: s.createdAt.toISOString(),
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4" /> Templates
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Apps send a template key and a context; admin renders it. That's why every Spurs email
            looks the same, and why restyling them is one change rather than six.
          </p>
        </CardHeader>
        <CardContent className="divide-y px-0">
          {TEMPLATES.map((t) => (
            <div key={t.key} className="flex flex-wrap items-start gap-3 px-6 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{t.label}</span>
                  <Badge variant="outline" className="font-mono text-xs">{t.key}</Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-sm">{t.description}</p>
              </div>
              <div className="text-muted-foreground max-w-xs text-xs">
                {t.variables.join(", ")}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
