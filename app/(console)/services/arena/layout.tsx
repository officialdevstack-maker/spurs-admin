import { Gamepad2, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ArenaTabs from "./ArenaTabs";

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
            <Gamepad2 className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Arena</h1>
            <p className="text-muted-foreground text-sm">
              Esports platform — 1v1 wagers, match betting, tournaments &amp; marketplace. Drive content and settle results here.
            </p>
          </div>
        </div>
        <a href="http://127.0.0.1:3600" target="_blank" rel="noreferrer">
          <Badge variant="outline" className="gap-1.5"><ArrowUpRight className="size-3" /> Open Arena</Badge>
        </a>
      </div>

      <ArenaTabs />
      {children}
    </div>
  );
}
