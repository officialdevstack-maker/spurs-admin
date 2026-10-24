"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { activeItem, type Workspace } from "@/lib/workspaces";
import ThemeToggle from "@/components/ThemeToggle";
import AdminMenu from "@/components/AdminMenu";
import MobileNav from "./MobileNav";
import type { ShellAdmin } from "./ShellFrame";

export default function Topbar({ ws, admin }: { ws: Workspace; admin: ShellAdmin }) {
  const pathname = usePathname();
  const item = activeItem(ws, pathname);
  const Icon = ws.icon;

  return (
    <header className="bg-background/70 supports-[backdrop-filter]:bg-background/50 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-6">
      <MobileNav ws={ws} permissions={admin.permissions} />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Icon className="text-primary size-4 shrink-0" />
        <span className="text-muted-foreground truncate">{ws.label}</span>
        {item && (
          <>
            <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate font-medium">{item.label}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <AdminMenu email={admin.email} role={admin.role} />
      </div>
    </header>
  );
}
