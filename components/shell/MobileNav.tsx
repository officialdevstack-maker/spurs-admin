"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Held, Workspace } from "@/lib/workspaces";
import SidebarBody from "./SidebarBody";

export default function MobileNav({
  ws,
  permissions,
  inboxCount,
  inboxIncomplete,
}: { ws: Workspace; permissions: Held; inboxCount: number | null; inboxIncomplete: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-80 gap-0 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <SidebarBody
            ws={ws}
            permissions={permissions}
            inboxCount={inboxCount}
            inboxIncomplete={inboxIncomplete}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
