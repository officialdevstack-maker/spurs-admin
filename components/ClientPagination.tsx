"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination for client tables that filter in memory. The link-based
 * `Pagination` is for server-rendered lists; this one is for tables where
 * search narrows the rows without a round trip.
 */
export function usePaged<T>(rows: T[], pageSize = 25) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));

  // A narrowing filter can strand you past the last page.
  useEffect(() => { if (page > pages) setPage(1); }, [page, pages]);

  const slice = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  return { page, setPage, pages, slice, total: rows.length, pageSize };
}

export default function ClientPagination({
  page, pages, total, pageSize, onPage,
}: {
  page: number; pages: number; total: number; pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "grid size-8 place-items-center rounded-md border transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
      <p className="text-muted-foreground text-sm">
        Showing <span className="text-foreground font-medium">{from}–{to}</span> of{" "}
        <span className="text-foreground font-medium">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous"
          className={`${btn} disabled:text-muted-foreground/40 hover:bg-accent disabled:cursor-not-allowed disabled:hover:bg-transparent`}>
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-muted-foreground px-2 text-sm">Page {page} of {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next"
          className={`${btn} disabled:text-muted-foreground/40 hover:bg-accent disabled:cursor-not-allowed disabled:hover:bg-transparent`}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
