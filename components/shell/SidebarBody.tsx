"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { activeItem, visibleItems, type Held, type Workspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";

export default function SidebarBody({
  ws,
  permissions,
  inboxCount,
  inboxIncomplete,
  onNavigate,
}: {
  ws: Workspace;
  permissions: Held;
  inboxCount: number | null;
  inboxIncomplete: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const current = activeItem(ws, pathname);

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 overflow-hidden border-b px-4 py-4">
        <div aria-hidden className="from-primary/15 via-primary/5 absolute inset-0 bg-gradient-to-br to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl shadow-sm">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold">{ws.label}</p>
            <p className="text-primary text-[10px] font-semibold tracking-wider uppercase">Control plane</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ws.sections.map((section, i) => {
          const items = visibleItems(section.items, permissions);
          if (!items.length) return null;
          const holdsCurrent = items.some((item) => item.href === current?.href);
          const open = holdsCurrent || !!section.defaultOpen;

          return (
            <details key={section.label ?? i} open={open} className="group">
              <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-medium tracking-wider uppercase select-none [&::-webkit-details-marker]:hidden">
                {section.label}
                <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
              </summary>

              <div className="space-y-0.5 pt-1 pb-3">
                {items.map((item) => {
                  const active = current?.href === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="bg-primary absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full" />
                      )}
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.href === "/inbox" && (inboxCount !== null && inboxCount > 0 || inboxIncomplete) && (
                        <span
                          title={inboxIncomplete ? "Some queue counts are unavailable" : `${inboxCount} items waiting`}
                          aria-label={inboxIncomplete ? "Some queue counts are unavailable" : `${inboxCount} items waiting`}
                          className="bg-primary/10 text-primary ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                        >
                          {inboxIncomplete ? "!" : inboxCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </nav>

      <div className="text-muted-foreground shrink-0 border-t px-5 py-4 text-xs">Control plane · v0.1</div>
    </div>
  );
}
