import { accounts } from "@/lib/sdk/accounts";
import RoleForm from "../RoleForm";

export const dynamic = "force-dynamic";

export default async function NewRolePage() {
  const catalog = await accounts.permissions();
  return <RoleForm role={null} catalog={catalog} />;
}
