import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-8" : "py-14"}`}>
      {Icon && (
        <span className="bg-muted grid size-12 place-items-center rounded-full">
          <Icon className="text-muted-foreground size-5" />
        </span>
      )}
      <p className={`text-sm font-medium ${Icon ? "mt-4" : ""}`}>{title}</p>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
