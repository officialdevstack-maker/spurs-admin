"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { survey, type TaskInput, type QuestionInput } from "@/lib/sdk/survey";

const err = (e: unknown) => (e instanceof Error ? e.message : "Could not save the task");

/** Create or update a task. The Earn app validates and owns the write. */
export async function saveTaskAction(
  id: string | null,
  task: TaskInput,
  questions: QuestionInput[],
) {
  const admin = await requireAdmin();
  try {
    const payload = { ...task, createdBy: admin.email, ownerType: "platform" as const };
    const res = id
      ? await survey.updateTask(id, payload, questions)
      : await survey.createTask(payload, questions);

    await logAction(admin, id ? "survey.task_update" : "survey.task_create", `${task.title} (${task.status})`);
    revalidatePath("/services/survey/tasks");
    revalidatePath("/services/survey");
    return { ok: true as const, id: res.task.id };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function setTaskStatusAction(id: string, status: "draft" | "live" | "paused" | "closed") {
  const admin = await requireAdmin();
  try {
    await survey.setTaskStatus(id, status);
    await logAction(admin, "survey.task_status", `${id} → ${status}`);
    revalidatePath("/services/survey/tasks");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function deleteTaskAction(id: string) {
  const admin = await requireAdmin();
  try {
    await survey.deleteTask(id);
    await logAction(admin, "survey.task_delete", id);
    revalidatePath("/services/survey/tasks");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
