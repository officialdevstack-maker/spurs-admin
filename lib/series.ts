import type { Point } from "@/components/charts/LineChart";

/**
 * Fill a continuous run of days with zeroes so empty data stays visible.
 */
export function dailyPoints(series: { date: string; value: number }[], days: number): Point[] {
  const by = new Map(series.map((s) => [s.date, s.value]));
  const out: Point[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    out.push({
      label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      full: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }),
      value: by.get(key) ?? 0,
    });
  }

  return out;
}
