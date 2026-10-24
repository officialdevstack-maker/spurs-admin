"use client";

import Link from "next/link";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { MoreHorizontal, Copy, User, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import type { AccountUser } from "@/lib/sdk/accounts";

const hasRole: FilterFn<AccountUser> = (row, id, val: string[]) => {
  if (!val?.length) return true;
  const names = row.original.roles.map((r) => r.name);
  return val.some((v) => names.includes(v));
};

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

function TrustChip({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const cls =
    score >= 80 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : score >= 65 ? "bg-green-500/15 text-green-600 dark:text-green-400"
    : score >= 45 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    : score >= 25 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
    : "bg-destructive/15 text-destructive";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>{score}</span>;
}

const columns: ColumnDef<AccountUser>[] = [
  {
    id: "user",
    accessorFn: (u) => `${u.name} ${u.email}`,
    header: ({ column }) => <SortableHeader column={column} title="User" />,
    cell: ({ row }) => (
      <Link href={`/services/accounts/users/${row.original.id}`} className="group block">
        <div className="font-medium group-hover:underline">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </Link>
    ),
  },
  {
    id: "verified",
    accessorFn: (u) => (u.email_verified ? "Verified" : "Unverified"),
    header: "Email",
    filterFn: (row, id, val: string[]) => !val?.length || val.includes(String(row.getValue(id))),
    cell: ({ row }) =>
      row.original.email_verified
        ? <Badge variant="success">Verified</Badge>
        : <Badge variant="warning">Unverified</Badge>,
  },
  {
    id: "roles",
    accessorFn: (u) => u.roles.map((r) => r.name).join(" "),
    header: "Roles",
    filterFn: hasRole,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.roles.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
        {row.original.roles.map((r) => (
          <Badge key={r.name} variant={r.name === "superadmin" ? "default" : "secondary"}>{r.label}</Badge>
        ))}
      </div>
    ),
  },
  {
    id: "trust",
    accessorFn: (u) => u.trust_score ?? -1,
    header: ({ column }) => <SortableHeader column={column} title="Trust" />,
    cell: ({ row }) => <TrustChip score={row.original.trust_score} />,
  },
  {
    id: "created",
    accessorFn: (u) => u.created_at ?? "",
    header: ({ column }) => <SortableHeader column={column} title="Joined" />,
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{date(row.original.created_at)}</span>,
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
            <DropdownMenuItem asChild><Link href={`/services/accounts/users/${u.id}`}><User className="size-3.5" /> View & manage roles</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(u.id))}><Copy className="size-3.5" /> Copy user ID</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(u.email)}><Copy className="size-3.5" /> Copy email</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function AccountsUsersTable({ data, roleOptions }: { data: AccountUser[]; roleOptions: { label: string; value: string }[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search accounts by name or email…"
      filters={[
        { columnId: "roles", title: "Role", options: roleOptions },
        { columnId: "verified", title: "Email", options: [{ label: "Verified", value: "Verified" }, { label: "Unverified", value: "Unverified" }] },
      ]}
      enableSelection={false}
    />
  );
}
