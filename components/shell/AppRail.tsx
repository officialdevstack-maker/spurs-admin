"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { GROUPS, visibleWorkspaces, type Held } from "@/lib/workspaces";

export default function AppRail({ current, permissions }: { current: string; permissions: Held }) {
  const visible = visibleWorkspaces(permissions);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center gap-2 overflow-y-auto border-r border-white/5 bg-[oklch(0.17_0.02_288)] py-3 md:flex [scrollbar-width:none]">
      <div className="mb-1 grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
        <ShieldCheck className="size-5" />
      </div>

      {GROUPS.map((group, gi) => {
        const list = visible.filter((w) => w.group === group);
        if (!list.length) return null;
        return (
          <div key={group} className="flex flex-col items-center gap-2">
            {gi > 0 && <div className="my-1 h-px w-8 bg-white/10" />}
            {list.map((w) => {
              const active = w.id === current;
              const c = w.chroma ?? 0.21;
              return (
                <Link
                  key={w.id}
                  href={w.home}
                  title={w.label}
                  aria-label={w.label}
                  aria-current={active ? "page" : undefined}
                  className="relative grid size-10 shrink-0 place-items-center rounded-xl transition-all hover:rounded-2xl hover:bg-white/10"
                  style={
                    active
                      ? { background: `oklch(0.58 ${c} ${w.hue})`, color: "white" }
                      : { color: `oklch(0.78 ${c * 0.6} ${w.hue})` }
                  }
                >
                  {active && <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-white" />}
                  <w.icon className="size-[18px]" />
                </Link>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
