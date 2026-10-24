"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { PayoutRow } from "@/lib/pay-data";

const naira = (k: number, cur = "NGN") => (cur === "NGN" ? "₦" : cur + " ") + (k / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 });
const sv: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", completed: "success", pending: "warning", processing: "warning", failed: "destructive", reversed: "secondary",
};
const some: FilterFn<PayoutRow> = (row, id, val: string[]) => !val?.length || val.includes(String(row.getValue(id)));

const columns: ColumnDef<PayoutRow>[] = [
  { id: "reference", accessorKey: "reference", header: "Reference", cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span> },
  {
    id: "merchant", accessorFn: (p) => `${p.merchant ?? ""} ${p.recipient ?? ""}`, header: "Merchant → Recipient",
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{row.original.merchant ?? "—"}</div>
        <div className="text-muted-foreground text-xs">{row.original.recipient ?? "—"}{row.original.bank ? ` · ${row.original.bank}` : ""}</div>
      </div>
    ),
  },
  { id: "mode", accessorKey: "mode", header: "Mode", filterFn: some, cell: ({ row }) => <Badge variant={row.original.mode === "live" ? "success" : "warning"}>{row.original.mode}</Badge> },
  { id: "status", accessorKey: "status", header: "Status", filterFn: some, cell: ({ row }) => <Badge variant={sv[row.original.status] ?? "secondary"}>{row.original.status}</Badge> },
  {
    id: "amount", accessorKey: "amount",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Amount" /></div>,
    cell: ({ row }) => <div className="text-right font-semibold">{naira(row.original.amount, row.original.currency)}</div>,
  },
  {
    id: "actions", enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.reference)}><Copy className="size-3.5" /> Copy reference</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function PayoutsTable({ data }: { data: PayoutRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search payouts by reference, merchant, recipient…"
      filters={[
        { columnId: "mode", title: "Mode", options: [{ label: "Live", value: "live" }, { label: "Test", value: "test" }] },
        { columnId: "status", title: "Status", options: [
          { label: "Successful", value: "successful" }, { label: "Pending", value: "pending" }, { label: "Failed", value: "failed" },
        ] },
      ]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("payouts.csv", rows.map((p) => ({
            reference: p.reference, merchant: p.merchant, recipient: p.recipient, bank: p.bank,
            amount: (p.amount / 100).toFixed(2), currency: p.currency, status: p.status, mode: p.mode, createdAt: p.createdAt,
          }))),
        },
      ]}
    />
  );
}
