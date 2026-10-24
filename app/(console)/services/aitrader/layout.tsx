import { LineChart, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AiTraderTabs from "./AiTraderTabs";

export default function AiTraderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
            <LineChart className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Trader</h1>
            <p className="text-muted-foreground text-sm">
              Strategy-ensemble trading engine — risk-managed execution across Bybit and MetaTrader. Reads its config from here.
            </p>
          </div>
        </div>
        <a href="http://127.0.0.1:3800" target="_blank" rel="noreferrer">
          <Badge variant="outline" className="gap-1.5"><ArrowUpRight className="size-3" /> Open Trader console</Badge>
        </a>
      </div>

      <AiTraderTabs />
      {children}
    </div>
  );
}
