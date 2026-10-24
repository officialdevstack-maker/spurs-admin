"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Copy, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { PaymentRow } from "@/lib/data";

const naira = (kobo: number, cur = "NGN") =>
  (cur === "NGN" ? "₦" : cur + " ") + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 });

const sv: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success", pending: "warning", failed: "destructive",
  refunded: "secondary", partially_refunded: "secondary",
};

const includesSome: FilterFn<PaymentRow> = (row, id, val: string[]) =>
  !val?.length || val.includes(String(row.getValue(id)));

const columns: ColumnDef<PaymentRow>[] = [
  {
    id: "reference",
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span>,
  },
  {
    id: "party",
    accessorFn: (p) => `${p.business ?? ""} ${p.customerEmail ?? ""}`,
    header: "Merchant / Customer",
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{row.original.business ?? "—"}</div>
        <div className="text-muted-foreground text-xs">{row.original.customerEmail ?? "—"}</div>
      </div>
    ),
  },
  {
    id: "mode",
    accessorKey: "mode",
    header: "Mode",
    filterFn: includesSome,
    cell: ({ row }) => <Badge variant={row.original.mode === "live" ? "success" : "warning"}>{row.original.mode}</Badge>,
  },
  {
    id: "method",
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => <span className="text-muted-foreground text-sm capitalize">{row.original.method?.replace(/_/g, " ") ?? "—"}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    filterFn: includesSome,
    cell: ({ row }) => <Badge variant={sv[row.original.status] ?? "secondary"}>{row.original.status}</Badge>,
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Amount" /></div>,
    cell: ({ row }) => <div className="text-right font-semibold">{naira(row.original.amount, row.original.currency)}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(p.reference)}><Copy className="size-3.5" /> Copy reference</DropdownMenuItem>
            {p.customerEmail && <DropdownMenuItem onClick={() => navigator.clipboard.writeText(p.customerEmail!)}><Copy className="size-3.5" /> Copy customer email</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`http://127.0.0.1:3100/dashboard/payments/${p.reference}`} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open in Pay</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function PaymentsTable({ data }: { data: PaymentRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search by reference, merchant, customer…"
      filters={[
        { columnId: "mode", title: "Mode", options: [{ label: "Live", value: "live" }, { label: "Test", value: "test" }] },
        { columnId: "status", title: "Status", options: [
          { label: "Successful", value: "successful" }, { label: "Pending", value: "pending" },
          { label: "Failed", value: "failed" }, { label: "Refunded", value: "refunded" },
        ] },
      ]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("payments.csv", rows.map((p) => ({
            reference: p.reference, mode: p.mode, status: p.status, method: p.method,
            amount: (p.amount / 100).toFixed(2), currency: p.currency,
            merchant: p.business, customer: p.customerEmail, createdAt: p.createdAt,
          }))),
        },
      ]}
    />
  );
}
