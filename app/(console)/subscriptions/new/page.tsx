import { requirePermission } from "@/lib/auth";
import { createPlanAction } from "../actions";
import { PlanForm } from "../PlanForm";
import PageHeader from "@/components/page/PageHeader";

export const dynamic = "force-dynamic";

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("platform.settings.manage");
  const { error } = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader title="New subscription plan" description="Create a plan and define its price, access, and trading allowance." back={{ href: "/subscriptions", label: "Plans" }} />
      <PlanForm action={createPlanAction} error={error} />
    </div>
  );
}
