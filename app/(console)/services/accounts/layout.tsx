import { Fingerprint, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AccountsTabs from "./AccountsTabs";

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
            <Fingerprint className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground text-sm">Spurs identity provider — users, roles and permissions for all of Spurs Cloud.</p>
          </div>
        </div>
        <a href="http://127.0.0.1:8000" target="_blank" rel="noreferrer">
          <Badge variant="outline" className="gap-1.5"><ArrowUpRight className="size-3" /> Open Accounts app</Badge>
        </a>
      </div>

      <AccountsTabs />

      {children}
    </div>
  );
}
