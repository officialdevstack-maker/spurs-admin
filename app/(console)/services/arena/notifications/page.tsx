import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page/PageHeader";
import Notice from "@/components/page/Notice";
import { requirePermission } from "@/lib/auth";
import { overview } from "@/lib/arena";
import { sendNotificationAction } from "../actions";

export const dynamic = "force-dynamic";

const inp = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";

export default async function ArenaNotifications() {
  await requirePermission("platform.mail.manage");
  const data = await overview();
  const sent = data?.notifications ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Arena notifications" description="Send in-app announcements to all Arena users or a single customer." />
      {!data && (
        <Notice tone="warning" title="Arena service is unavailable.">
          Check that the Arena service is running and its internal URL and secret are configured.
        </Notice>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Send an in-app notification</CardTitle></CardHeader>
        <CardContent>
          <form action={sendNotificationAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Audience">
              <select name="audience" className={inp} defaultValue="all">
                <option value="all">Everyone (broadcast)</option>
                <option value="user">A single user (by id)</option>
              </select>
            </Field>
            <Field label="Level">
              <select name="level" className={inp} defaultValue="info">
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
              </select>
            </Field>
            <Field label="Target user id (only for single user)">
              <input name="userId" placeholder="spurs user id / sub" className={inp} />
            </Field>
            <Field label="Link (optional, in-app path)">
              <input name="href" placeholder="/dashboard/tournaments" className={inp} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Title"><input name="title" required placeholder="New tournament this weekend 🏆" className={inp} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Message">
                <textarea name="body" required rows={3} placeholder="Register now for the ₦128,000 FIFA Cup — spots are filling up."
                  className="w-full rounded-lg border bg-transparent p-3 text-sm outline-none focus:border-primary" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
                Send notification
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recently sent</CardTitle></CardHeader>
        <CardContent>
          {sent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing sent yet.</p>
          ) : (
            <div className="space-y-2">
              {sent.map((n) => (
                <div key={n.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="capitalize">{n.level}</Badge>
                      <Badge variant="outline">{n.audience === "all" ? "broadcast" : "direct"}</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{n.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(n.createdAt).toLocaleString()}{n.createdBy ? ` · ${n.createdBy}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-muted-foreground mb-1 block text-xs">{label}</span>{children}</label>;
}
