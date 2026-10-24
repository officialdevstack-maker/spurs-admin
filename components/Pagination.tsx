import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Link-based pagination for server-rendered lists (the DataTable has its own).
 * Keeps existing query params so filters survive page changes.
 */
export default function Pagination({
  page, pageSize, total, basePath, params = {}, paramName = "page",
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  /** Lets two independent lists paginate on one page. */
  paramName?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set(paramName, String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="text-muted-foreground text-sm">
        Showing <span className="text-foreground font-medium">{from}–{to}</span> of{" "}
        <span className="text-foreground font-medium">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={href(page - 1)} disabled={page <= 1} label="Previous">
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="text-muted-foreground px-2 text-sm">Page {page} of {pages}</span>
        <PageLink href={href(page + 1)} disabled={page >= pages} label="Next">
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "grid size-8 place-items-center rounded-md border transition-colors";
  if (disabled) {
    return <span aria-disabled className={`${cls} text-muted-foreground/40 cursor-not-allowed`}>{children}</span>;
  }
  return <Link href={href} aria-label={label} className={`${cls} hover:bg-accent`}>{children}</Link>;
}
