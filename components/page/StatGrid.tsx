import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
} as const;

export default function StatGrid({ cols = 4, children }: { cols?: keyof typeof COLS; children: ReactNode }) {
  return <div className={cn("grid gap-4", COLS[cols])}>{children}</div>;
}
