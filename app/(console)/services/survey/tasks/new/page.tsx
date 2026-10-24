import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import TaskBuilder from "../TaskBuilder";

export default async function NewTask() {
  await requirePermission("ops.tasks.manage");
  return (
    <div className="space-y-4">
      <div>
        <Link href="/services/survey/tasks"
          className="text-muted-foreground hover:text-foreground mb-1.5 inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="size-4" /> All tasks
        </Link>
        <h2 className="text-xl font-semibold tracking-tight">New task</h2>
        <p className="text-muted-foreground text-sm">
          Publish straight away, or save it as a draft and come back to it.
        </p>
      </div>
      <TaskBuilder />
    </div>
  );
}
