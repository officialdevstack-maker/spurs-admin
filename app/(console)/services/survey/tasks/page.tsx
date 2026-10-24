import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import TasksTable, { type TaskRow } from "./TasksTable";

export const dynamic = "force-dynamic";

export default async function Tasks() {
  await requirePermission("ops.tasks.manage");
  const rows = (await survey.tasks()) as unknown as TaskRow[];
  return <TasksTable rows={rows} />;
}
