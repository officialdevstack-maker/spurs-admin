import { ClipboardList, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SurveyTabs from "./SurveyTabs";

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Earn</h1>
            <p className="text-muted-foreground text-sm">
              Tasks, levels, anti-cheat and cash-outs — the task-to-earn side of the platform.
            </p>
          </div>
        </div>
        <a href="http://127.0.0.1:3400" target="_blank" rel="noreferrer">
          <Badge variant="outline" className="gap-1.5"><ArrowUpRight className="size-3" /> Open Earn app</Badge>
        </a>
      </div>

      <SurveyTabs />
      {children}
    </div>
  );
}
