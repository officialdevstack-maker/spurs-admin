import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { survey, type QuestionInput } from "@/lib/sdk/survey";
import PageHeader from "@/components/page/PageHeader";
import TaskBuilder from "../TaskBuilder";

export const dynamic = "force-dynamic";

export default async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("ops.tasks.manage");
  const { id } = await params;

  const detail = await survey.getTask(id).catch(() => null);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={detail.task.title}
        description={`${detail.responses.toLocaleString()} ${detail.responses === 1 ? "response" : "responses"} so far.`}
        back={{ href: "/services/survey/tasks", label: "All tasks" }}
      />

      <TaskBuilder
        existing={{
          id,
          task: detail.task,
          responses: detail.responses,
          questions: detail.questions.map((q): QuestionInput => ({
            prompt: q.prompt,
            type: q.type as QuestionInput["type"],
            options: q.options ?? [],
            required: q.required,
          })),
        }}
      />
    </div>
  );
}
