import { accounts } from "@/lib/sdk/accounts";
import { requirePermission } from "@/lib/auth";
import RolesManager from "./RolesManager";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requirePermission("console.roles.manage");
  const roles = await accounts.roles();
  return <RolesManager roles={roles} />;
}
