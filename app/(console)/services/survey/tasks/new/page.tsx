import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import TaskBuilder from "../TaskBuilder";

export const dynamic = "force-dynamic";

export default async function NewTask() {
  await requirePermission("ops.tasks.manage");
  return (
    <div className="space-y-4">
      <PageHeader
        title="New task"
        description="Publish straight away, or save it as a draft and come back to it."
        back={{ href: "/services/survey/tasks", label: "All tasks" }}
      />
      <TaskBuilder />
    </div>
  );
}
