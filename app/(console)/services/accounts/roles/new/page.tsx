import { accounts } from "@/lib/sdk/accounts";
import { requirePermission } from "@/lib/auth";
import RoleForm from "../RoleForm";

export const dynamic = "force-dynamic";

export default async function NewRolePage() {
  await requirePermission("console.roles.manage");
  const catalog = await accounts.permissions();
  return <RoleForm role={null} catalog={catalog} />;
}
