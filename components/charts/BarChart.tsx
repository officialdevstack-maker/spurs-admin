"use client";

import { useState } from "react";

export interface BarDatum { label: string; value: number; sub?: string }

/** Single-hue horizontal bar chart (violet) for categorical magnitude. */
export default function BarChart({ data }: { data: BarDatum[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="space-y-1" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{d.label}</span>
            <span className="text-muted-foreground tabular-nums">{d.value}{d.sub ? <span className="ml-1 text-xs">{d.sub}</span> : null}</span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className={"h-full rounded-full transition-[width,background-color] " + (hover === i ? "bg-primary" : "bg-primary/60")}
              style={{ width: `max(${(d.value / max) * 100}%, ${d.value > 0 ? 6 : 0}px)` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
