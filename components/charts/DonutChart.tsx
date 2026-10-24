"use client";

import { useState } from "react";

export interface Slice { label: string; value: number; color: string }

/**
 * Donut for a small composition. Slices carry fixed colors (identity is never
 * color-alone — every slice is in the legend with its label and count), and a
 * 2px surface gap separates adjacent arcs.
 */
export default function DonutChart({ data, centerLabel }: { data: Slice[]; centerLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const real = data.reduce((s, d) => s + d.value, 0);

  const size = 168, stroke = 24, r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const gap = real > 0 ? 2 : 0; // user-unit gap between arcs
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} />
          {real > 0 && data.map((d, i) => {
            if (d.value === 0) return null;
            const len = (d.value / total) * C;
            const dash = Math.max(0, len - gap);
            const el = (
              <circle
                key={d.label}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color}
                strokeWidth={hover === i ? stroke + 3 : stroke}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: "stroke-width .12s" }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{hover !== null ? data[hover].value : real}</span>
          <span className="text-muted-foreground text-xs">{hover !== null ? data[hover].label : (centerLabel ?? "total")}</span>
        </div>
      </div>

      <ul className="w-full max-w-[200px] space-y-1.5">
        {data.map((d, i) => (
          <li
            key={d.label}
            className="flex items-center gap-2 text-sm"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 capitalize">{d.label}</span>
            <span className="text-muted-foreground tabular-nums">{d.value}</span>
            <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">{real ? Math.round((d.value / real) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
