import Link from "next/link";
import { ArrowUpRight, ClipboardList, HandCoins, Inbox, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminWithPermissions } from "@/lib/auth";
import { getInboxQueueCounts } from "@/lib/inbox";

export const dynamic = "force-dynamic";

const queueIcons = {
  cashouts: {
    icon: Wallet,
  },
  submissions: {
    icon: ClipboardList,
  },
  giftcards: {
    icon: ShieldCheck,
  },
  advances: {
    icon: HandCoins,
  },
} as const;

export default async function InboxPage() {
  const admin = await getAdminWithPermissions();
  const summary = await getInboxQueueCounts(admin?.permissions ?? []);
  const { queues, total, incomplete } = summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground text-sm">
            Review work from across Spurs, together in one place.
          </p>
        </div>
        <Badge variant={incomplete || total ? "secondary" : "outline"}>
          {incomplete ? "Some counts unavailable" : total ? `${total} waiting` : "All clear"}
        </Badge>
      </div>

      {incomplete && (
        <Card>
          <CardContent className="border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            One or more queue counts could not be loaded. Check the service connection and refresh.
          </CardContent>
        </Card>
      )}

      {queues.length > 0 && (
        <Card className="gap-0 py-0">
          <CardContent className="divide-y px-0">
            {queues.map((queue) => {
              const Icon = queueIcons[queue.id].icon;
              if (queue.error) {
                return (
                  <div key={queue.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 grid size-10 shrink-0 place-items-center rounded-xl">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{queue.label}</span>
                      <span className="text-muted-foreground block text-sm">{queue.error}</span>
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={queue.id}
                  href={queue.href}
                  className="hover:bg-muted/50 flex items-center gap-4 px-5 py-4 transition-colors"
                >
                  <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{queue.label}</span>
                    <span className="text-muted-foreground block text-sm">
                      {queue.count === 0 ? "Nothing waiting for review." : `Review ${queue.count} item${queue.count === 1 ? "" : "s"} waiting.`}
                    </span>
                  </span>
                  <Badge variant="secondary" className="tabular-nums">
                    {queue.count}
                  </Badge>
                  <ArrowUpRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
      {queues.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="text-muted-foreground size-8" />
            <h2 className="font-medium">No review queues available</h2>
            <p className="text-muted-foreground text-sm">
              You don’t have permission to review any queues. Open Overview or ask an administrator for access.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
