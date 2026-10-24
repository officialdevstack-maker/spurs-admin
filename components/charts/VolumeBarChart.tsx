"use client";

import { useState } from "react";

export interface Bar {
  label: string; // x-axis label (e.g. "12 Jul")
  full: string; // full label for tooltip
  value: number; // major units
}

const fmt = (v: number) =>
  "₦" +
  (v >= 1_000_000
    ? (v / 1_000_000).toFixed(1) + "M"
    : v >= 1_000
      ? (v / 1_000).toFixed(1) + "k"
      : v.toFixed(0));

export default function VolumeBarChart({ data }: { data: Bar[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  // grid ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  // show ~6 evenly spaced x labels
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div className="w-full">
      <div className="flex gap-3">
        {/* y axis */}
        <div className="text-muted-foreground flex h-48 w-10 shrink-0 flex-col-reverse justify-between py-1 text-right text-[10px] tabular-nums">
          {ticks.map((t, i) => (
            <span key={i}>{fmt(t)}</span>
          ))}
        </div>

        {/* plot */}
        <div className="relative flex-1">
          {/* gridlines */}
          <div className="absolute inset-0 flex flex-col-reverse justify-between py-1">
            {ticks.map((_, i) => (
              <div key={i} className="border-border/60 border-t border-dashed first:border-solid" />
            ))}
          </div>

          <div className="relative flex h-48 items-end gap-[3px] py-1">
            {data.map((d, i) => {
              const h = (d.value / max) * 100;
              const active = hover === i;
              return (
                <div
                  key={i}
                  className="group relative flex h-full flex-1 items-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={
                      "w-full rounded-t-sm transition-colors " +
                      (active ? "bg-primary" : "bg-primary/45 group-hover:bg-primary/70")
                    }
                    style={{ height: `max(${h}%, ${d.value > 0 ? 2 : 0}px)` }}
                  />
                  {active && (
                    <div className="bg-popover text-popover-foreground pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 rounded-md border px-2 py-1 text-center shadow-md">
                      <div className="text-[11px] font-semibold whitespace-nowrap">{fmt(d.value)}</div>
                      <div className="text-muted-foreground text-[10px] whitespace-nowrap">{d.full}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* x axis */}
          <div className="text-muted-foreground mt-1.5 flex gap-[3px] text-[10px]">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                {i % labelEvery === 0 ? d.label : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
