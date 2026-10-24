import type { ReactNode } from "react";
import { Check, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger";

const STYLE: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: "border-border bg-muted/40", icon: "text-muted-foreground", Icon: Info },
  success: { box: "border-emerald-500/40 bg-emerald-500/10", icon: "text-emerald-600", Icon: Check },
  warning: { box: "border-amber-500/40 bg-amber-500/10", icon: "text-amber-600", Icon: TriangleAlert },
  danger: { box: "border-red-500/40 bg-red-500/10", icon: "text-red-600", Icon: TriangleAlert },
};

export default function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = STYLE[tone];

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="text-muted-foreground min-w-0">
        {title && <strong className="text-foreground">{title}</strong>}
        {title && children ? " " : null}
        {children}
      </div>
    </div>
  );
}
