"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { workspaceFor, type Held } from "@/lib/workspaces";
import type { InboxQueueSummary } from "@/lib/inbox";
import ContextSidebar from "./ContextSidebar";
import Topbar from "./Topbar";

export interface ShellAdmin {
  email: string;
  role: string;
  permissions: Held;
}

export default function ShellFrame({
  admin,
  inbox,
  children,
}: { admin: ShellAdmin; inbox: InboxQueueSummary; children: ReactNode }) {
  const pathname = usePathname();
  const ws = workspaceFor(pathname);

  const shellStyle = {
    ["--ws-hue" as string]: String(ws.hue),
    ["--ws-chroma" as string]: String(ws.chroma ?? 0.21),
  } as CSSProperties;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ws-hue", String(ws.hue));
    root.style.setProperty("--ws-chroma", String(ws.chroma ?? 0.21));
  }, [ws.chroma, ws.hue]);

  return (
    <div data-ws className="min-h-screen" style={shellStyle}>
      <ContextSidebar
        ws={ws}
        permissions={admin.permissions}
        inboxCount={inbox.total}
        inboxIncomplete={inbox.incomplete}
      />
      <div className="flex min-h-screen flex-col md:pl-60">
        <Topbar ws={ws} admin={admin} inboxCount={inbox.total} inboxIncomplete={inbox.incomplete} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
