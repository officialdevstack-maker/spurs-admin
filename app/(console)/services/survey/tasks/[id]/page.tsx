import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { survey, type QuestionInput } from "@/lib/sdk/survey";
import TaskBuilder from "../TaskBuilder";

export const dynamic = "force-dynamic";

export default async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const detail = await survey.getTask(id).catch(() => null);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/services/survey/tasks"
          className="text-muted-foreground hover:text-foreground mb-1.5 inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="size-4" /> All tasks
        </Link>
        <h2 className="text-xl font-semibold tracking-tight">{detail.task.title}</h2>
        <p className="text-muted-foreground text-sm">
          {detail.responses.toLocaleString()} {detail.responses === 1 ? "response" : "responses"} so far.
        </p>
      </div>

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
