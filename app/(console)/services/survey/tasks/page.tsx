import { survey } from "@/lib/sdk/survey";
import TasksTable, { type TaskRow } from "./TasksTable";

export const dynamic = "force-dynamic";

export default async function Tasks() {
  const rows = (await survey.tasks()) as unknown as TaskRow[];
  return <TasksTable rows={rows} />;
}
