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
import type { AccountUser } from "@/lib/sdk/accounts";

type CustomerDirectoryRow = UserRow & { account?: AccountUser };

const includesSome: FilterFn<CustomerDirectoryRow> = (row, id, val: string[]) =>
  !val?.length || val.includes(String(row.getValue(id)));

const columns: ColumnDef<CustomerDirectoryRow>[] = [
  {
    id: "user",
    accessorFn: (u) => `${u.name ?? ""} ${u.email ?? ""} ${u.account?.name ?? ""} ${u.account?.email ?? ""}`,
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
    id: "verified",
    accessorFn: (u) => u.account ? (u.account.email_verified ? "Verified" : "Unverified") : "No Accounts profile",
    header: "Email verification",
    filterFn: includesSome,
    cell: ({ row }) => {
      const account = row.original.account;
      return account
        ? account.email_verified
          ? <Badge variant="success">Verified</Badge>
          : <Badge variant="warning">Unverified</Badge>
        : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: "roles",
    accessorFn: (u) => u.account?.roles.map((role) => role.name).join(" ") ?? "",
    header: "Accounts roles",
    filterFn: (row, id, val: string[]) =>
      !val?.length || val.some((role) => row.original.account?.roles.some((item) => item.name === role)),
    cell: ({ row }) => {
      const roles = row.original.account?.roles ?? [];
      return roles.length
        ? <div className="flex flex-wrap gap-1">{roles.map((role) => <Badge key={role.name} variant={role.name === "superadmin" ? "default" : "secondary"}>{role.label}</Badge>)}</div>
        : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: "trust",
    accessorFn: (u) => u.account?.trust_score ?? -1,
    header: ({ column }) => <SortableHeader column={column} title="Trust" />,
    cell: ({ row }) => {
      const score = row.original.account?.trust_score;
      if (score == null) return <span className="text-muted-foreground">—</span>;
      const variant = score >= 65 ? "success" : score >= 45 ? "warning" : "destructive";
      return <Badge variant={variant}>{score}</Badge>;
    },
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

export default function UsersTable({
  data,
  roles,
}: {
  data: CustomerDirectoryRow[];
  roles: { label: string; value: string }[];
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search customers by name, email, or ID…"
      filters={[
        { columnId: "verified", title: "Email verification", options: [
          { label: "Verified", value: "Verified" },
          { label: "Unverified", value: "Unverified" },
          { label: "No Accounts profile", value: "No Accounts profile" },
        ] },
        { columnId: "roles", title: "Accounts role", options: roles },
        { columnId: "wallet", title: "Wallet", options: [{ label: "Has wallet", value: "Yes" }, { label: "No wallet", value: "No" }] },
        { columnId: "merchant", title: "Merchant", options: [{ label: "Merchant", value: "Yes" }, { label: "Not merchant", value: "No" }] },
      ]}
      bulkActions={[
        {
          label: "Export CSV", icon: Download,
          onClick: (rows) => downloadCsv("customers.csv", rows.map((u) => ({
            id: u.id, name: u.name, email: u.email, emailVerified: u.account?.email_verified ?? null,
            roles: u.account?.roles.map((role) => role.label).join(", ") ?? "",
            trustScore: u.account?.trust_score ?? null, hasWallet: u.hasWallet, isMerchant: u.isMerchant, projects: u.projects,
          }))),
        },
      ]}
    />
  );
}
