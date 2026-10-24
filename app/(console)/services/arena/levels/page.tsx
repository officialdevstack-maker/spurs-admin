import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { can, requirePermission } from "@/lib/auth";
import { overview } from "@/lib/arena";
import { seedLevelsAction, upsertLevelAction, deleteLevelAction } from "../actions";

export const dynamic = "force-dynamic";

const inp = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";
const btn = "bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90";
const naira = (kobo: number) => Math.round(kobo / 100);

export default async function ArenaLevels() {
  const [, canSeed] = await Promise.all([
    requirePermission("money.adjust"),
    can("platform.settings.manage"),
  ]);
  const data = await overview();
  const levels = [...(data?.levels ?? [])].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Level ladder &amp; rewards</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Define the XP needed to reach each level, its title, and the wallet reward players
          claim on reaching it. Changes apply live — the arena reads this ladder directly. If
          it&apos;s empty, the arena falls back to a built-in default curve.
        </p>
      </div>

      {!data && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Arena service unreachable — editing will fail until it&apos;s running. Check the Settings tab.
        </p>
      )}

      {/* Add / edit a level */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Add or update a level</CardTitle></CardHeader>
        <CardContent>
          <form action={upsertLevelAction} className="grid gap-4 sm:grid-cols-4">
            <Field label="Level">
              <input name="level" type="number" min="1" step="1" required placeholder="6" className={inp} />
            </Field>
            <Field label="Title">
              <input name="title" required placeholder="Pro" className={inp} />
            </Field>
            <Field label="XP to reach">
              <input name="minXp" type="number" min="0" step="1" required placeholder="3750" className={inp} />
            </Field>
            <Field label="Reward (₦)">
              <input name="reward" type="number" min="0" step="1" required placeholder="600" className={inp} />
            </Field>
            <div className="sm:col-span-4">
              <button type="submit" className={btn}><Plus className="mr-1 inline size-4" /> Save level</button>
              <span className="text-muted-foreground ml-3 text-xs">Using an existing level number updates that row.</span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* The ladder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Ladder ({levels.length})</CardTitle>
          {levels.length === 0 && canSeed && (
            <form action={seedLevelsAction}>
              <button type="submit" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Seed default ladder</button>
            </form>
          )}
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No custom ladder yet — the arena is using the built-in default curve. Seed it to start editing.
            </p>
          ) : (
            <div className="space-y-2">
              {/* header */}
              <div className="text-muted-foreground hidden grid-cols-[64px_1fr_1fr_1fr_auto] gap-3 px-1 text-xs sm:grid">
                <span>Level</span><span>Title</span><span>XP to reach</span><span>Reward (₦)</span><span></span>
              </div>
              {levels.map((l) => (
                <div key={l.level} className="rounded-lg border p-2.5">
                  <div className="grid items-end gap-3 sm:grid-cols-[64px_1fr_1fr_1fr_auto]">
                    <form action={upsertLevelAction} id={`lvl-${l.level}`} className="contents">
                      <input type="hidden" name="level" value={l.level} />
                      <div>
                        <span className="text-muted-foreground mb-1 block text-xs sm:hidden">Level</span>
                        <div className="flex h-10 items-center px-1 text-sm font-semibold tabular-nums">{l.level}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground mb-1 block text-xs sm:hidden">Title</span>
                        <input name="title" defaultValue={l.title} className={inp} />
                      </div>
                      <div>
                        <span className="text-muted-foreground mb-1 block text-xs sm:hidden">XP to reach</span>
                        <input name="minXp" type="number" min="0" step="1" defaultValue={l.minXp} className={inp} />
                      </div>
                      <div>
                        <span className="text-muted-foreground mb-1 block text-xs sm:hidden">Reward (₦)</span>
                        <input name="reward" type="number" min="0" step="1" defaultValue={naira(l.rewardMinor)} className={inp} />
                      </div>
                    </form>
                    <div className="flex gap-2">
                      <button type="submit" form={`lvl-${l.level}`} className={btn}>Save</button>
                      <form action={deleteLevelAction}>
                        <input type="hidden" name="level" value={l.level} />
                        <button type="submit" aria-label={`Delete level ${l.level}`}
                          className="text-destructive hover:bg-destructive/10 grid h-10 w-10 place-items-center rounded-lg border">
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </div>
                  </div>
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
