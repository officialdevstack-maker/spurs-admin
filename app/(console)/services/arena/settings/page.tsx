import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import { resolveConfig } from "@/lib/credentials";
import { saveArenaSettings } from "../actions";

export const dynamic = "force-dynamic";

const inp = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";

export default async function ArenaSettings() {
  await requirePermission("platform.credentials.manage");
  const cfg = await resolveConfig("esport");
  const set = (k: string) => Boolean(cfg[k]);

  return (
    <div className="space-y-6">
      <PageHeader title="Arena settings" description="Manage game-provider credentials and Arena's internal service connection." />
      <form action={saveArenaSettings} className="space-y-6">
      <p className="text-muted-foreground text-sm">
        The Arena app reads these values from the admin config registry. Keys are stored encrypted; leave a key blank to keep the current value.
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Stats providers</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Clash of Clans API token">
            <input name="COC_API_TOKEN" type="password" placeholder={set("COC_API_TOKEN") ? "•••••••• (set)" : "developer.clashofclans.com token"} className={inp} />
          </Field>
          <Field label="PUBG API key">
            <input name="PUBG_API_KEY" type="password" placeholder={set("PUBG_API_KEY") ? "•••••••• (set)" : "developer.pubg.com key"} className={inp} />
          </Field>
          <p className="text-muted-foreground sm:col-span-2 text-xs">
            Without a key, linking still works — the account is stored and shows as &quot;pending&quot; until a key is added. Free Fire has no public API (stored, manual).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Connection</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Arena internal URL">
            <input name="ESPORT_INTERNAL_URL" defaultValue={cfg.ESPORT_INTERNAL_URL ?? "http://127.0.0.1:3600"} className={inp} />
          </Field>
          <p className="text-muted-foreground sm:col-span-2 text-xs">
            The admin console reaches the Arena service here (using the shared INTERNAL_API_SECRET) to read data and settle results.
          </p>
        </CardContent>
      </Card>

      <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
        Save Arena settings
      </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-muted-foreground mb-1 block text-xs">{label}</span>{children}</label>;
}
