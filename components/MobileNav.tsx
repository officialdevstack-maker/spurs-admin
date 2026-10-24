"use client";

import { useState } from "react";
import { Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import SidebarNav from "./SidebarNav";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground flex w-64 flex-col gap-0 p-0">
        <SheetHeader className="h-16 justify-center px-5">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-lg">
              <ShieldCheck className="size-4" />
            </span>
            Spurs Admin
          </SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
        <div className="text-muted-foreground border-t px-5 py-4 text-xs">Control plane · v0.1</div>
      </SheetContent>
    </Sheet>
  );
}
