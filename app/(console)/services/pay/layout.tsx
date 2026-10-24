import { CreditCard, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PayTabs from "./PayTabs";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
            <CreditCard className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pay</h1>
            <p className="text-muted-foreground text-sm">Payments, merchants, payouts and the processor — the gateway that hides the real provider.</p>
          </div>
        </div>
        <a href="http://127.0.0.1:3100" target="_blank" rel="noreferrer">
          <Badge variant="outline" className="gap-1.5"><ArrowUpRight className="size-3" /> Open Pay app</Badge>
        </a>
      </div>

      <PayTabs />
      {children}
    </div>
  );
}
