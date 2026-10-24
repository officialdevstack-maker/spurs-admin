import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Tone = "default" | "good" | "warn" | "bad";

const VALUE_TONE: Record<Tone, string> = {
  default: "",
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-destructive",
};

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  trend,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: { text: string; up: boolean };
  href?: string;
}) {
  const body = (
    <Card className={cn("gap-3 py-5", href && "hover:border-primary/50 h-full transition-colors")}>
      <CardContent className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground truncate text-sm font-medium">{label}</span>
          {Icon && (
            <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className={cn("text-2xl font-bold tracking-tight tabular-nums", VALUE_TONE[tone])}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {trend ? (
          <div className={cn("flex items-center gap-1 text-xs", trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {trend.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            <span className="text-muted-foreground">{trend.text}</span>
          </div>
        ) : hint ? (
          <p className="text-muted-foreground truncate text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="block">{body}</Link> : body;
}
