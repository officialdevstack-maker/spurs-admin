import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { overview } from "@/lib/arena";
import { resolveDisputeAction, finalizeTournamentAction, refundOrderAction } from "./actions";

export const dynamic = "force-dynamic";

const naira = (m: number) => "₦" + Math.round((m ?? 0) / 100).toLocaleString("en-NG");
const inp = "h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus:border-primary";

export default async function ArenaOverview() {
  await requirePermission("money.read");
  const data = await overview();

  if (!data) {
    return (
      <Card className="border-amber-300/50">
        <CardContent className="py-4 text-sm text-amber-700 dark:text-amber-400">
          Arena service unreachable. Start it (<span className="font-mono">npm run dev</span> in <span className="font-mono">esport/</span>, :3600)
          and confirm <span className="font-mono">ESPORT_INTERNAL_URL</span> + <span className="font-mono">INTERNAL_API_SECRET</span> under Settings.
        </CardContent>
      </Card>
    );
  }

  const c = data.counts;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Games" value={c.games} />
        <Tile label="Disputes" value={c.disputes} tone={c.disputes ? "bad" : undefined} />
        <Tile label="Open matches" value={c.openMatches} />
        <Tile label="Live tournaments" value={c.tournaments} />
        <Tile label="Open orders" value={c.orders} />
      </div>

      {/* Disputes */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">1v1 disputes to resolve</CardTitle></CardHeader>
        <CardContent>
          {data.disputes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No disputes. 🎉</p>
          ) : (
            <div className="space-y-3">
              {data.disputes.map((d) => (
                <div key={d.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{d.title}</span>
                    <span className="text-muted-foreground text-xs">pot {naira(d.stakeMinor * 2)}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{d.creatorName} vs {d.opponentName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AwardBtn challengeId={d.id} winnerId={d.creatorId} label={`${d.creatorName} won`} />
                    {d.opponentId && <AwardBtn challengeId={d.id} winnerId={d.opponentId} label={`${d.opponentName} won`} />}
                    <form action={resolveDisputeAction}>
                      <input type="hidden" name="challengeId" value={d.id} />
                      <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">Void (refund both)</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournaments */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Tournaments to finalize</CardTitle></CardHeader>
        <CardContent>
          {data.tournaments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No live tournaments.</p>
          ) : (
            <div className="space-y-4">
              {data.tournaments.map((t) => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    <Badge variant="outline">{t.gameName} · {t.players}/{t.maxPlayers} · {t.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Entrants: {t.entrants.map((e) => `${e.name ?? e.userId} (${e.userId.slice(0, 8)}…)`).join(", ") || "none"}
                  </p>
                  <form action={finalizeTournamentAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="tournamentId" value={t.id} />
                    <label className="flex-1 min-w-[240px]">
                      <span className="text-muted-foreground mb-1 block text-xs">Ranked winners (user ids, 1st first — one per line or comma-separated)</span>
                      <textarea name="rankedUserIds" rows={2} placeholder="user-id-1&#10;user-id-2&#10;user-id-3" className={inp + " h-auto py-2 font-mono"} />
                    </label>
                    <button className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium">Finalize &amp; pay pool</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">In-flight marketplace orders</CardTitle></CardHeader>
        <CardContent>
          {data.orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-xs uppercase">
                  <tr className="border-b"><th className="py-2 pr-4">Item</th><th className="py-2 pr-4">Price</th><th className="py-2 pr-4">Status</th><th className="py-2 text-right">Action</th></tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{o.title}</td>
                      <td className="py-2 pr-4">{naira(o.priceMinor)}</td>
                      <td className="py-2 pr-4"><Badge variant="outline">{o.status}</Badge></td>
                      <td className="py-2 text-right">
                        <form action={refundOrderAction}><input type="hidden" name="orderId" value={o.id} />
                          <button className="rounded-md border px-3 py-1 text-xs hover:bg-muted">Refund buyer</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AwardBtn({ challengeId, winnerId, label }: { challengeId: string; winnerId: string; label: string }) {
  return (
    <form action={resolveDisputeAction}>
      <input type="hidden" name="challengeId" value={challengeId} />
      <input type="hidden" name="winnerId" value={winnerId} />
      <button className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium">{label}</button>
    </form>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "bad" }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">{label}</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === "bad" && value > 0 ? "text-red-600" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
