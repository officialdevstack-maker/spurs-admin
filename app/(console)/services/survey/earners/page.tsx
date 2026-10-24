import { survey } from "@/lib/sdk/survey";
import { can, requirePermission } from "@/lib/auth";
import EarnersTable from "./EarnersTable";

export const dynamic = "force-dynamic";

export default async function Earners() {
  await requirePermission("customers.read");
  const [rows, canManageStanding, canAdjustXp] = await Promise.all([
    survey.earners(200),
    can("customers.suspend"),
    can("money.adjust"),
  ]);
  return <EarnersTable rows={rows} canManageStanding={canManageStanding} canAdjustXp={canAdjustXp} />;
}
