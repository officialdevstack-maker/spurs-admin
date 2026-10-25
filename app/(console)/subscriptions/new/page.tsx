import { requirePermission } from "@/lib/auth";
import { createPlanAction } from "../actions";
import { PlanForm } from "../PlanForm";

export const dynamic = "force-dynamic";

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("platform.settings.manage");
  const { error } = await searchParams;
  return <PlanForm action={createPlanAction} error={error} />;
}
