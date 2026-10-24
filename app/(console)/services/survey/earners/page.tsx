import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import EarnersTable from "./EarnersTable";

export const dynamic = "force-dynamic";

export default async function Earners() {
  await requirePermission("customers.read");
  const rows = await survey.earners(200);
  return <EarnersTable rows={rows} />;
}
