"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WORKSPACES, visibleItems, type Held } from "@/lib/workspaces";
import { searchCommandPalette } from "@/app/(console)/actions";
import type { CommandSearchResult } from "@/lib/command-search";

export default function CommandPalette({ permissions }: { permissions: Held }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entities, setEntities] = useState<CommandSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    const request = ++requestId.current;
    setError(null);
    if (term.length < 2) {
      setEntities([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      searchCommandPalette(term)
        .then((results) => {
          if (request === requestId.current) setEntities(results);
        })
        .catch((cause: unknown) => {
          if (request === requestId.current) {
            setEntities([]);
            setError(cause instanceof Error ? cause.message : "Search failed. Try again.");
          }
        })
        .finally(() => {
          if (request === requestId.current) setLoading(false);
        });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query]);

  const pages = useMemo(
    () => WORKSPACES.flatMap((workspace) =>
      workspace.sections.flatMap((section) => visibleItems(section.items, permissions)),
    ),
    [permissions],
  );
  const matchingPages = pages.filter((page) => page.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Search the console"
        aria-keyshortcuts="Control+K Meta+K"
        className="text-muted-foreground inline-flex gap-2"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="bg-muted hidden rounded px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
        <DialogContent className="top-[20%] max-w-xl translate-y-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search the console</DialogTitle>
            <DialogDescription>Find a page, customer, payment, or merchant.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, customers, payments, merchants…"
              className="h-12 border-0 px-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {matchingPages.length > 0 && (
              <section>
                <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium uppercase tracking-wide">Pages</p>
                {matchingPages.map((page) => (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => navigate(page.href)}
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm"
                  >
                    <page.icon className="text-muted-foreground size-4" />
                    <span className="flex-1">{page.label}</span>
                    <ArrowRight className="text-muted-foreground size-3.5" />
                  </button>
                ))}
              </section>
            )}
            {query.trim().length >= 2 && (
              <section>
                <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium uppercase tracking-wide">Records</p>
                {loading && <p className="text-muted-foreground px-2 py-3 text-sm">Searching…</p>}
                {error && <p role="alert" className="text-destructive px-2 py-3 text-sm">{error}</p>}
                {!loading && !error && entities.length === 0 && (
                  <p className="text-muted-foreground px-2 py-3 text-sm">No matching records.</p>
                )}
                {entities.map((entity) => (
                  <button
                    key={`${entity.kind}-${entity.id}`}
                    type="button"
                    onClick={() => navigate(entity.href)}
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm"
                  >
                    <span className="bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-semibold uppercase">
                      {entity.kind === "customer" ? "C" : entity.kind === "payment" ? "P" : "M"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{entity.label}</span>
                      <span className="text-muted-foreground block truncate text-xs">{entity.description}</span>
                    </span>
                  </button>
                ))}
              </section>
            )}
            {matchingPages.length === 0 && query.trim().length < 2 && (
              <p className="text-muted-foreground px-2 py-4 text-sm">
                Type to search pages. Enter at least two characters to find records.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
