"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { visibleWorkspaces, type Held, type Workspace } from "@/lib/workspaces";
import SidebarBody from "./SidebarBody";

export default function MobileNav({ ws, permissions }: { ws: Workspace; permissions: Held }) {
  const [open, setOpen] = useState(false);
  const all = visibleWorkspaces(permissions);

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

        <div className="grid shrink-0 grid-cols-5 gap-2 border-b p-3">
          {all.map((w) => {
            const active = w.id === ws.id;
            const c = w.chroma ?? 0.21;
            return (
              <Link
                key={w.id}
                href={w.home}
                title={w.label}
                aria-label={w.label}
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-xl transition-all"
                style={
                  active
                    ? { background: `oklch(0.58 ${c} ${w.hue})`, color: "white" }
                    : { background: `oklch(0.6 ${c} ${w.hue} / 0.14)`, color: `oklch(0.5 ${c} ${w.hue})` }
                }
              >
                <w.icon className="size-5" />
              </Link>
            );
          })}
        </div>

        <div className="min-h-0 flex-1">
          <SidebarBody ws={ws} permissions={permissions} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
