"use client";

import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { activeItem, sectionFor, workspaceFor } from "@/lib/workspaces";

export default function WorkspaceHeader() {
  const pathname = usePathname();
  const ws = workspaceFor(pathname);
  const item = activeItem(ws, pathname);
  const section = sectionFor(ws, pathname);
  if (!item) return null;

  const Icon = item.icon;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-2xl shadow-sm">
          <Icon className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{item.label}</h1>
          <p className="text-muted-foreground text-sm">{section?.label}</p>
        </div>
      </div>
      {section?.external && (
        <a href={section.external.href} target="_blank" rel="noreferrer">
          <Badge variant="outline" className="gap-1.5">
            <ArrowUpRight className="size-3" /> {section.external.label}
          </Badge>
        </a>
      )}
    </div>
  );
}
