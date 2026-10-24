"use client";

import Link from "next/link";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Copy, Download, Wallet, Landmark, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/csv";
import type { UserRow } from "@/lib/data";

const includesSome: FilterFn<UserRow> = (row, id, val: string[]) =>
  !val?.length || val.includes(String(row.getValue(id)));

const columns: ColumnDef<UserRow>[] = [
  {
    id: "user",
    accessorFn: (u) => `${u.name ?? ""} ${u.email ?? ""}`,
    header: ({ column }) => <SortableHeader column={column} title="User" />,
    cell: ({ row }) => (
      <Link href={`/users/${row.original.id}`} className="group block">
        <div className="font-medium group-hover:underline">{row.original.name ?? "—"}</div>
        <div className="text-muted-foreground text-xs">{row.original.email ?? "—"}</div>
      </Link>
    ),
  },
  {
    id: "id",
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{row.original.id}</span>,
  },
  {
    id: "wallet",
    accessorFn: (u) => (u.hasWallet ? "Yes" : "No"),
    header: "Wallet",
    filterFn: includesSome,
    cell: ({ row }) => (row.original.hasWallet ? <Badge variant="success">Yes</Badge> : <span className="text-muted-foreground">—</span>),
  },
  {
    id: "merchant",
    accessorFn: (u) => (u.isMerchant ? "Yes" : "No"),
    header: "Merchant",
    filterFn: includesSome,
    cell: ({ row }) => (row.original.isMerchant ? <Badge variant="success">Yes</Badge> : <span className="text-muted-foreground">—</span>),
  },
  {
    id: "projects",
    accessorKey: "projects",
    header: ({ column }) => <SortableHeader column={column} title="Projects" />,
    cell: ({ row }) => row.original.projects || <span className="text-muted-foreground">0</span>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const u = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/users/${u.id}`}><User className="size-3.5" /> View details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(u.id)}><Copy className="size-3.5" /> Copy user ID</DropdownMenuItem>
            {u.email && <DropdownMenuItem onClick={() => navigator.clipboard.writeText(u.email!)}><Copy className="size-3.5" /> Copy email</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!u.hasWallet}><Wallet className="size-3.5" /> View wallet</DropdownMenuItem>
            <DropdownMenuItem disabled={!u.isMerchant}><Landmark className="size-3.5" /> View merchant</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function UsersTable({ data }: { data: UserRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search users by name, email, ID…"
      filters={[
        { columnId: "wallet", title: "Wallet", options: [{ label: "Has wallet", value: "Yes" }, { label: "No wallet", value: "No" }] },
        { columnId: "merchant", title: "Merchant", options: [{ label: "Merchant", value: "Yes" }, { label: "Not merchant", value: "No" }] },
      ]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("users.csv", rows.map((u) => ({
            id: u.id, name: u.name, email: u.email, hasWallet: u.hasWallet, isMerchant: u.isMerchant, projects: u.projects,
          }))),
        },
      ]}
    />
  );
}
