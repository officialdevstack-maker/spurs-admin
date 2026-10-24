"use client";

import type { Held, Workspace } from "@/lib/workspaces";
import SidebarBody from "./SidebarBody";

export default function ContextSidebar({ ws, permissions }: { ws: Workspace; permissions: Held }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-16 z-30 hidden w-60 border-r md:block">
      <SidebarBody ws={ws} permissions={permissions} />
    </aside>
  );
}
