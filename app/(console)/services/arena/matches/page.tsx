import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { overview } from "@/lib/arena";
import { createMatchAction, settleMatchAction } from "../actions";

export const dynamic = "force-dynamic";

const inp = "h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus:border-primary";
const odds = (x?: number | null) => (x && x > 100 ? (x / 100).toFixed(2) : "—");

export default async function ArenaMatches() {
  await requirePermission("money.read");
  const data = await overview();
  const games = (data?.games ?? []).filter((g) => g.supportsBetting);
  const matches = data?.matches ?? [];

  return (
    <div className="space-y-6">
      {/* Create */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Add a pro fixture</CardTitle></CardHeader>
        <CardContent>
          {games.length === 0 ? (
            <p className="text-muted-foreground text-sm">No betting-enabled games. Enable betting on a game under the Games tab first.</p>
          ) : (
            <form action={createMatchAction} className="grid gap-4 sm:grid-cols-2">
              <Field label="Game">
                <select name="gameId" required className={inp} defaultValue={games[0]?.id}>
                  {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
              <Field label="Competition (optional)"><input name="competition" placeholder="ESL Pro League" className={inp} /></Field>
              <Field label="Home team"><input name="homeName" required placeholder="Team Liquid" className={inp} /></Field>
              <Field label="Away team"><input name="awayName" required placeholder="OG" className={inp} /></Field>
              <Field label="Starts at"><input name="startsAt" type="datetime-local" required className={inp} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Home odds"><input name="homeOdds" type="number" step="0.01" min="1.01" placeholder="1.85" className={inp} /></Field>
                <Field label="Away odds"><input name="awayOdds" type="number" step="0.01" min="1.01" placeholder="1.95" className={inp} /></Field>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">Create match (opens betting)</button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Open + settle */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Open matches</CardTitle></CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open matches.</p>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{m.homeName} <span className="text-muted-foreground">v</span> {m.awayName}</span>
                    <Badge variant="outline">{m.gameName} · {odds(m.homeOddsX100)}/{odds(m.awayOddsX100)} · {m.status}</Badge>
                  </div>
                  <form action={settleMatchAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="matchId" value={m.id} />
                    <label><span className="text-muted-foreground mb-1 block text-xs">Result</span>
                      <select name="result" required className={inp + " w-28"} defaultValue="">
                        <option value="" disabled>pick…</option>
                        <option value="home">Home won</option><option value="away">Away won</option><option value="draw">Draw (void)</option>
                      </select>
                    </label>
                    <label><span className="text-muted-foreground mb-1 block text-xs">Home</span><input name="homeScore" type="number" className={inp + " w-20"} /></label>
                    <label><span className="text-muted-foreground mb-1 block text-xs">Away</span><input name="awayScore" type="number" className={inp + " w-20"} /></label>
                    <button className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium">Settle &amp; pay bets</button>
                  </form>
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
