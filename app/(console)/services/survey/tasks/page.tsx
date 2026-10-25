import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import TasksTable, { type TaskRow } from "./TasksTable";

export const dynamic = "force-dynamic";

export default async function Tasks() {
  await requirePermission("ops.tasks.manage");
  const rows = (await survey.tasks()) as unknown as TaskRow[];
  return (
    <div className="space-y-6">
      <PageHeader title="Earn tasks" description={`${rows.length} task offers configured for Spurs Earn.`} />
      <TasksTable rows={rows} />
    </div>
  );
}
