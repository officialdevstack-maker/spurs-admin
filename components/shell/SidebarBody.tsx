"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { activeItem, visibleItems, type Held, type NavSection, type Workspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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

  const hasVisibleLinks = (section: NavSection): boolean =>
    visibleItems(section.items, permissions).length > 0 ||
    (section.sections?.some(hasVisibleLinks) ?? false);

  const containsCurrent = (section: NavSection): boolean =>
    section.items.some((item) => item.href === current?.href) ||
    (section.sections?.some(containsCurrent) ?? false);

  const renderSection = (section: NavSection, key: string, depth = 0): ReactNode => {
    const items = visibleItems(section.items, permissions);
    const children = section.sections ?? [];
    if (!items.length && !children.some(hasVisibleLinks)) return null;

    const holdsCurrent = containsCurrent(section);
    return (
      <details
        key={key}
        open={holdsCurrent || !!section.defaultOpen}
        className="group/section"
      >
        <summary
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors select-none [&::-webkit-details-marker]:hidden",
            depth > 0 && "px-3 py-1.5 text-[11px] tracking-wide normal-case",
          )}
        >
          <span className="truncate">{section.label}</span>
          <ChevronRight className="size-3 shrink-0 transition-transform group-open/section:rotate-90" />
        </summary>

        <div className={cn("space-y-0.5 pb-2", depth > 0 && "ml-2 border-l border-sidebar-border pl-2")}>
          {items.map((item) => {
            const active = current?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="bg-primary absolute top-1/2 -left-2 h-5 w-1 -translate-y-1/2 rounded-r-full" />
                )}
                <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
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
          {children.map((child, index) =>
            renderSection(child, `${key}-${child.label ?? index}`, depth + 1),
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 overflow-hidden border-b border-sidebar-border px-4 py-5">
        <div aria-hidden className="from-primary/15 via-primary/5 absolute inset-0 bg-gradient-to-br to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl shadow-sm ring-4 ring-primary/10">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold">{ws.label}</p>
            <p className="text-primary mt-1 text-[10px] font-semibold tracking-[0.15em] uppercase">Admin console</p>
          </div>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ws.sections.map((section, index) =>
          renderSection(section, section.label ?? String(index)),
        )}
      </nav>

      <div className="text-muted-foreground shrink-0 border-t border-sidebar-border px-5 py-4 text-[11px]">
        Control plane <span className="mx-1.5 text-sidebar-border">·</span> v0.1
      </div>
    </div>
  );
}
