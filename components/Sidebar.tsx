import { ShieldCheck } from "lucide-react";
import SidebarNav from "./SidebarNav";

export default function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r md:flex">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-lg">
          <ShieldCheck className="size-4" />
        </span>
        Spurs Admin
      </div>
      <SidebarNav />
      <div className="text-muted-foreground border-t px-5 py-4 text-xs">Control plane · v0.1</div>
    </aside>
  );
}
