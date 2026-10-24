"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Copy, Store, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { MerchantRow } from "@/lib/pay-data";

const naira = (k: number) => "₦" + Math.round(k / 100).toLocaleString("en-NG");
const date = (s: string) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

const columns: ColumnDef<MerchantRow>[] = [
  {
    id: "business",
    accessorFn: (m) => `${m.business ?? ""} ${m.email ?? ""}`,
    header: ({ column }) => <SortableHeader column={column} title="Merchant" />,
    cell: ({ row }) => (
      <Link href={`/services/pay/merchants/${row.original.id}`} className="group block">
        <div className="font-medium group-hover:underline">{row.original.business ?? "—"}</div>
        <div className="text-muted-foreground text-xs">{row.original.email ?? "—"}</div>
      </Link>
    ),
  },
  {
    id: "collected",
    accessorKey: "collected",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Collected" /></div>,
    cell: ({ row }) => <div className="text-right font-semibold">{naira(row.original.collected)}</div>,
  },
  {
    id: "payments",
    accessorKey: "payments",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Payments" /></div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.payments}</div>,
  },
  {
    id: "payouts",
    accessorKey: "payouts",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Payouts" /></div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.payouts}</div>,
  },
  {
    id: "joined",
    accessorFn: (m) => m.createdAt ?? "",
    header: ({ column }) => <SortableHeader column={column} title="Joined" />,
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{date(row.original.createdAt)}</span>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const m = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild><Link href={`/services/pay/merchants/${m.id}`}><Store className="size-3.5" /> View merchant</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(m.id)}><Copy className="size-3.5" /> Copy merchant ID</DropdownMenuItem>
            {m.email && <DropdownMenuItem onClick={() => navigator.clipboard.writeText(m.email!)}><Copy className="size-3.5" /> Copy email</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function MerchantsTable({ data }: { data: MerchantRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search merchants by name or email…"
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("merchants.csv", rows.map((m) => ({
            id: m.id, business: m.business, email: m.email,
            collected: (m.collected / 100).toFixed(2), payments: m.payments, payouts: m.payouts, joined: m.createdAt,
          }))),
        },
      ]}
    />
  );
}
