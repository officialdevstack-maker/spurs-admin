import { requireAdmin } from "@/lib/auth";
import { createPlanAction } from "../actions";
import { PlanForm } from "../PlanForm";

export const dynamic = "force-dynamic";

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return <PlanForm action={createPlanAction} error={error} />;
}
