import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { overview } from "@/lib/arena";
import { upsertGameAction, seedGamesAction } from "../actions";

export const dynamic = "force-dynamic";

const inp = "h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus:border-primary";

export default async function ArenaGames() {
  await requirePermission("platform.settings.manage");
  const data = await overview();
  const games = data?.games ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Game catalogue</CardTitle>
          <form action={seedGamesAction}>
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">Seed defaults</button>
          </form>
        </CardHeader>
        <CardContent>
          {games.length === 0 ? (
            <p className="text-muted-foreground text-sm">No games. Seed the defaults or add one below.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Platform</th>
                    <th className="py-2 pr-4">Modes</th><th className="py-2 pr-4">Linkable</th><th className="py-2 pr-4">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id} className="border-b last:border-0">
                      <td className="py-2 pr-4"><span className="font-medium">{g.name}</span> <span className="text-muted-foreground text-xs">{g.slug}</span></td>
                      <td className="py-2 pr-4 capitalize">{g.platform}</td>
                      <td className="py-2 pr-4 text-xs">
                        {[g.supports1v1 && "1v1", g.supportsBetting && "bet", g.supportsTournaments && "cup"].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-2 pr-4">{g.linkable ? <Badge variant="outline">{g.provider}</Badge> : "—"}</td>
                      <td className="py-2 pr-4">{g.active ? <Badge>active</Badge> : <Badge variant="outline">hidden</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / edit game (upsert by slug) */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Add or update a game</CardTitle></CardHeader>
        <CardContent>
          <form action={upsertGameAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug (unique)"><input name="slug" required placeholder="valorant" className={inp} /></Field>
            <Field label="Name"><input name="name" required placeholder="Valorant" className={inp} /></Field>
            <Field label="Platform">
              <select name="platform" className={inp} defaultValue="crossplay">
                <option value="console">console</option><option value="pc">pc</option>
                <option value="mobile">mobile</option><option value="crossplay">crossplay</option>
              </select>
            </Field>
            <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={0} className={inp} /></Field>
            <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
              <Check name="supports1v1" label="1v1 wagers" defaultChecked />
              <Check name="supportsBetting" label="Match betting" />
              <Check name="supportsTournaments" label="Tournaments" defaultChecked />
              <Check name="linkable" label="Account linking" />
            </div>
            <Field label="Stats provider (if linkable)">
              <select name="provider" className={inp} defaultValue="manual">
                <option value="manual">manual (no API)</option>
                <option value="coc">Clash of Clans</option>
                <option value="pubg">PUBG</option>
                <option value="freefire">Free Fire</option>
              </select>
            </Field>
            <Field label="Handle label"><input name="handleLabel" placeholder="Player Tag" className={inp} /></Field>
            <input type="hidden" name="active" value="true" />
            <div className="sm:col-span-2">
              <button type="submit" className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">Save game</button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-muted-foreground mb-1 block text-xs">{label}</span>{children}</label>;
}
function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-[var(--primary)]" /> {label}
    </label>
  );
}
