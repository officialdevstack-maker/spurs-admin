"use client";

import { useState } from "react";

export interface Point { label: string; full: string; value: number }

/** Single-series line+area chart (violet). Crosshair + tooltip on hover. */
export default function LineChart({ data, unit = "" }: { data: Point[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const n = data.length;
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => (1 - v / max) * 100;

  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `0,100 ${line} 100,100`;
  const labelEvery = Math.ceil(n / 6);

  return (
    <div className="flex gap-3">
      <div className="text-muted-foreground flex h-44 w-8 flex-col justify-between py-1 text-right text-[10px] tabular-nums">
        {ticks.map((t) => <span key={t}>{Math.round(t * max)}</span>)}
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 flex flex-col justify-between py-1">
          {ticks.map((t) => <div key={t} className="border-border/60 border-t border-dashed last:border-solid" />)}
        </div>

        <div className="relative h-44 py-1"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const rel = (e.clientX - r.left) / r.width;
            setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
          }}
        >
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points={area} className="fill-primary/12" />
            <polyline points={line} fill="none" className="stroke-primary" strokeWidth={2}
              vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          {hover !== null && (
            <>
              <div className="bg-primary/40 pointer-events-none absolute top-1 bottom-1 w-px" style={{ left: `${x(hover)}%` }} />
              <div className="border-primary bg-background pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ left: `${x(hover)}%`, top: `calc(${y(data[hover].value)}% )` }} />
              <div className="bg-popover text-popover-foreground pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border px-2 py-1 text-center shadow-md"
                style={{ left: `${Math.min(90, Math.max(10, x(hover)))}%`, top: `calc(${y(data[hover].value)}% - 8px)` }}>
                <div className="text-[11px] font-semibold whitespace-nowrap">{data[hover].value}{unit}</div>
                <div className="text-muted-foreground text-[10px] whitespace-nowrap">{data[hover].full}</div>
              </div>
            </>
          )}
        </div>

        <div className="text-muted-foreground mt-1.5 flex text-[10px]">
          {data.map((d, i) => (
            <div key={i} className="flex-1 text-center" style={{ flexBasis: `${100 / n}%` }}>
              {i % labelEvery === 0 ? d.label : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
