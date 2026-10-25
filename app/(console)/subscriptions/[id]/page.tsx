import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getPlanById } from "@/lib/plans";
import { updatePlanAction } from "../actions";
import { PlanForm } from "../PlanForm";
import PageHeader from "@/components/page/PageHeader";

export const dynamic = "force-dynamic";

export default async function EditPlan({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requirePermission("platform.settings.manage");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const plan = await getPlanById(id);
  if (!plan) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${plan.name}`} description={`Update the ${plan.appId} subscription plan.`} back={{ href: "/subscriptions", label: "Plans" }} />
      <PlanForm plan={plan} action={updatePlanAction} error={error} />
    </div>
  );
}
