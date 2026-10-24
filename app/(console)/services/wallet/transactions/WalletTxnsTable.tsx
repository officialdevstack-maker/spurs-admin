"use client";

import Link from "next/link";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Copy, Download, CreditCard, Landmark, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { WalletTxn } from "@/lib/wallet-data";

const DECIMALS: Record<string, number> = { NGN: 2, USD: 2, USDT: 6, BTC: 8 };
const SYM: Record<string, string> = { NGN: "₦", USD: "$", USDT: "₮", BTC: "₿" };
function fmt(minor: string, asset: string) {
  const d = DECIMALS[asset] ?? 2;
  const neg = minor.startsWith("-");
  const abs = minor.replace("-", "").padStart(d + 1, "0");
  const whole = abs.slice(0, abs.length - d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + (SYM[asset] ?? "") + whole + (d ? "." + abs.slice(-d) : "");
}
const some: FilterFn<WalletTxn> = (row, id, val: string[]) => !val?.length || val.includes(String(row.getValue(id)));

/** Where a funding reference came from — the cross-service link. */
function Origin({ ref }: { ref: string | null }) {
  if (!ref) return <span className="text-muted-foreground text-xs">—</span>;
  if (ref.startsWith("bnk_")) {
    return <span className="inline-flex items-center gap-1 text-xs"><Landmark className="size-3 text-amber-500" /> <span className="font-mono">{ref}</span></span>;
  }
  if (ref.startsWith("spy_")) {
    return <Link href="/services/pay/payments" className="inline-flex items-center gap-1 text-xs hover:underline"><CreditCard className="size-3 text-sky-500" /> <span className="font-mono">{ref}</span></Link>;
  }
  // wtp_ = wallet top-up funded via Pay
  return <span className="inline-flex items-center gap-1 text-xs"><CreditCard className="size-3 text-sky-500" /> <span className="font-mono">{ref}</span></span>;
}

const columns: ColumnDef<WalletTxn>[] = [
  { id: "reference", accessorKey: "reference", header: "Reference", cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span> },
  {
    id: "holder", accessorFn: (t) => t.userEmail ?? t.userId, header: "Holder",
    cell: ({ row }) => <Link href={`/users/${row.original.userId}`} className="text-sm hover:underline">{row.original.userEmail ?? row.original.userId}</Link>,
  },
  { id: "asset", accessorKey: "asset", header: "Asset", filterFn: some, cell: ({ row }) => <Badge variant="outline">{row.original.asset}</Badge> },
  { id: "source", accessorKey: "source", header: "Source", filterFn: some, cell: ({ row }) => <span className="text-muted-foreground text-sm capitalize">{row.original.source.replace(/_/g, " ")}</span> },
  { id: "origin", accessorFn: (t) => t.relatedRef ?? "", header: "Origin", enableSorting: false, cell: ({ row }) => <Origin ref={row.original.relatedRef} /> },
  { id: "direction", accessorKey: "direction", header: "Direction", filterFn: some, cell: ({ row }) => <Badge variant={row.original.direction === "credit" ? "success" : "secondary"}>{row.original.direction}</Badge> },
  {
    id: "amount", accessorKey: "amount",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Amount" /></div>,
    cell: ({ row }) => {
      const t = row.original; const credit = t.direction === "credit";
      return <div className={"text-right font-semibold tabular-nums " + (credit ? "text-emerald-600 dark:text-emerald-400" : "")}>{credit ? "+" : "-"}{fmt(t.amount, t.asset)}</div>;
    },
  },
  {
    id: "actions", enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.reference)}><Copy className="size-3.5" /> Copy reference</DropdownMenuItem>
          <DropdownMenuItem asChild><Link href={`/users/${row.original.userId}`}><ArrowLeftRight className="size-3.5" /> View holder</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function WalletTxnsTable({ data }: { data: WalletTxn[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search by reference, holder, source…"
      filters={[
        { columnId: "direction", title: "Direction", options: [{ label: "Credit", value: "credit" }, { label: "Debit", value: "debit" }] },
        { columnId: "source", title: "Source", options: [
          { label: "Top-up", value: "top_up" }, { label: "Payment", value: "payment" },
          { label: "Convert", value: "convert" }, { label: "Send", value: "send" },
        ] },
      ]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("wallet-transactions.csv", rows.map((t) => ({
            reference: t.reference, holder: t.userEmail ?? t.userId, asset: t.asset,
            direction: t.direction, amount: t.amount, source: t.source, origin: t.relatedRef, createdAt: t.createdAt,
          }))),
        },
      ]}
    />
  );
}
