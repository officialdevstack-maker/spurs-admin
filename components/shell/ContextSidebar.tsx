"use client";

import type { Held, Workspace } from "@/lib/workspaces";
import SidebarBody from "./SidebarBody";

export default function ContextSidebar({
  ws,
  permissions,
  inboxCount,
  inboxIncomplete,
}: { ws: Workspace; permissions: Held; inboxCount: number | null; inboxIncomplete: boolean }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30 hidden w-60 border-r md:block">
      <SidebarBody ws={ws} permissions={permissions} inboxCount={inboxCount} inboxIncomplete={inboxIncomplete} />
    </aside>
  );
}
