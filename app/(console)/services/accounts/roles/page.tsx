import { accounts } from "@/lib/sdk/accounts";
import RolesManager from "./RolesManager";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await accounts.roles();
  return <RolesManager roles={roles} />;
}
