"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { TxnRow } from "@/lib/data";

const DECIMALS: Record<string, number> = { NGN: 2, USD: 2, USDT: 6, BTC: 8 };
const SYM: Record<string, string> = { NGN: "₦", USD: "$", USDT: "₮", BTC: "₿" };
function fmt(minor: string, asset: string) {
  const d = DECIMALS[asset] ?? 2;
  const neg = minor.startsWith("-");
  const abs = minor.replace("-", "").padStart(d + 1, "0");
  const whole = abs.slice(0, abs.length - d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = d ? "." + abs.slice(-d) : "";
  return (neg ? "-" : "") + (SYM[asset] ?? "") + whole + frac;
}

const includesSome: FilterFn<TxnRow> = (row, id, val: string[]) =>
  !val?.length || val.includes(String(row.getValue(id)));

const columns: ColumnDef<TxnRow>[] = [
  {
    id: "reference",
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span>,
  },
  {
    id: "user",
    accessorFn: (t) => t.userEmail ?? t.userId,
    header: "User",
    cell: ({ row }) => <span className="text-sm">{row.original.userEmail ?? row.original.userId}</span>,
  },
  {
    id: "asset",
    accessorKey: "asset",
    header: "Asset",
    filterFn: includesSome,
    cell: ({ row }) => <Badge variant="outline">{row.original.asset}</Badge>,
  },
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => <span className="text-muted-foreground text-sm capitalize">{row.original.source.replace(/_/g, " ")}</span>,
  },
  {
    id: "direction",
    accessorKey: "direction",
    header: "Direction",
    filterFn: includesSome,
    cell: ({ row }) => <Badge variant={row.original.direction === "credit" ? "success" : "secondary"}>{row.original.direction}</Badge>,
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Amount" /></div>,
    cell: ({ row }) => {
      const t = row.original;
      const credit = t.direction === "credit";
      return (
        <div className={"text-right font-semibold tabular-nums " + (credit ? "text-emerald-600 dark:text-emerald-400" : "")}>
          {credit ? "+" : "-"}{fmt(t.amount, t.asset)}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const t = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(t.reference)}><Copy className="size-3.5" /> Copy reference</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(t.userId)}><Copy className="size-3.5" /> Copy user ID</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function TransactionsTable({ data }: { data: TxnRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search by reference, user, source…"
      filters={[
        { columnId: "direction", title: "Direction", options: [{ label: "Credit", value: "credit" }, { label: "Debit", value: "debit" }] },
        { columnId: "asset", title: "Asset", options: [
          { label: "NGN", value: "NGN" }, { label: "USD", value: "USD" },
          { label: "USDT", value: "USDT" }, { label: "BTC", value: "BTC" },
        ] },
      ]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("transactions.csv", rows.map((t) => ({
            reference: t.reference, user: t.userEmail ?? t.userId, asset: t.asset,
            direction: t.direction, amount: t.amount, source: t.source, createdAt: t.createdAt,
          }))),
        },
      ]}
    />
  );
}
