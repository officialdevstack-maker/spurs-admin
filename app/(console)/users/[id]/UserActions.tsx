"use client";

import { MoreHorizontal, Copy, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserActions({ id, email }: { id: string; email: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          Actions <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>User actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(id)}><Copy className="size-3.5" /> Copy user ID</DropdownMenuItem>
        {email && <DropdownMenuItem onClick={() => navigator.clipboard.writeText(email)}><Copy className="size-3.5" /> Copy email</DropdownMenuItem>}
        {email && (
          <DropdownMenuItem asChild>
            <a href={`mailto:${email}`}><Mail className="size-3.5" /> Email user</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`http://127.0.0.1:8000/admin/users/${id}`} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Open in Accounts</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
