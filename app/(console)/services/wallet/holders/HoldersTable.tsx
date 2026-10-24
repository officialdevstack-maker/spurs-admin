"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Copy, User, Download, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { WalletHolder } from "@/lib/wallet-data";

const naira = (k: number) => "₦" + Math.round(k / 100).toLocaleString("en-NG");

const columns: ColumnDef<WalletHolder>[] = [
  {
    id: "holder",
    accessorFn: (h) => `${h.name ?? ""} ${h.email ?? ""} ${h.userId}`,
    header: ({ column }) => <SortableHeader column={column} title="Holder" />,
    cell: ({ row }) => (
      <Link href={`/users/${row.original.userId}`} className="group block">
        <div className="font-medium group-hover:underline">{row.original.name ?? "—"}</div>
        <div className="text-muted-foreground text-xs">{row.original.email ?? row.original.userId}</div>
      </Link>
    ),
  },
  {
    id: "balance",
    accessorKey: "ngnBalance",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="NGN balance" /></div>,
    cell: ({ row }) => <div className="text-right font-semibold">{naira(row.original.ngnBalance)}</div>,
  },
  {
    id: "assets",
    accessorKey: "assets",
    header: ({ column }) => <div className="text-right"><SortableHeader column={column} title="Assets" /></div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.assets}</div>,
  },
  {
    id: "va",
    accessorFn: (h) => (h.hasVirtualAccount ? "Yes" : "No"),
    header: "Virtual account",
    filterFn: (row, id, val: string[]) => !val?.length || val.includes(String(row.getValue(id))),
    cell: ({ row }) => row.original.hasVirtualAccount
      ? <Badge variant="secondary"><Building2 className="size-3" /> Yes</Badge>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild><Link href={`/users/${row.original.userId}`}><User className="size-3.5" /> View user (all services)</Link></DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.userId)}><Copy className="size-3.5" /> Copy user ID</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function HoldersTable({ data }: { data: WalletHolder[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search holders by name, email, ID…"
      filters={[{ columnId: "va", title: "Virtual account", options: [{ label: "Has VA", value: "Yes" }, { label: "No VA", value: "No" }] }]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("wallet-holders.csv", rows.map((h) => ({
            userId: h.userId, name: h.name, email: h.email, ngnBalance: (h.ngnBalance / 100).toFixed(2), assets: h.assets, virtualAccount: h.hasVirtualAccount,
          }))),
        },
      ]}
    />
  );
}
