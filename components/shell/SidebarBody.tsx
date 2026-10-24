"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { activeItem, visibleItems, type Held, type Workspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";

export default function SidebarBody({
  ws,
  permissions,
  onNavigate,
}: { ws: Workspace; permissions: Held; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeItem(ws, pathname);

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 overflow-hidden border-b px-4 py-4">
        <div aria-hidden className="from-primary/15 via-primary/5 absolute inset-0 bg-gradient-to-br to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl shadow-sm">
            <ws.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold">{ws.label}</p>
            <p className="text-primary text-[10px] font-semibold tracking-wider uppercase">
              {ws.group === "service" ? "Admin" : "Console"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {ws.sections.map((section, i) => {
          const items = visibleItems(section.items, permissions);
          if (!items.length) return null;
          return (
            <div key={section.label ?? i}>
              {section.label && (
                <p className="text-muted-foreground mb-1.5 px-3 text-[11px] font-medium tracking-wider uppercase">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
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
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {ws.external ? (
        <a
          href={ws.external.href}
          target="_blank"
          rel="noreferrer"
          className="bg-card hover:border-primary/50 m-3 flex shrink-0 items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors"
        >
          <span className="min-w-0">
            <span className="text-muted-foreground block text-xs">Live product</span>
            <span className="block truncate font-medium">{ws.external.label}</span>
          </span>
          <ArrowUpRight className="text-primary size-4 shrink-0" />
        </a>
      ) : (
        <div className="text-muted-foreground shrink-0 border-t px-5 py-4 text-xs">Control plane · v0.1</div>
      )}
    </div>
  );
}
