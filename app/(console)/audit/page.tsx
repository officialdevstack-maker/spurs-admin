import { desc } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/page/PageHeader";
import SectionCard from "@/components/page/SectionCard";
import EmptyState from "@/components/page/EmptyState";
import { requirePermission } from "@/lib/auth";
import { db, auditLog } from "@/lib/db";
import { formatWhen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requirePermission("console.audit.read");
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Every privileged action in the control plane." />

      <SectionCard title={`Latest ${rows.length}`} icon={ScrollText} flush>
        {rows.length === 0 ? (
          <EmptyState compact title="No activity yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground pl-6 text-xs">{formatWhen(r.createdAt)}</TableCell>
                  <TableCell className="text-sm">{r.adminEmail ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[22rem] truncate text-xs">{r.target ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
