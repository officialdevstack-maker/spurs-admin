import { accounts } from "@/lib/sdk/accounts";
import { requirePermission } from "@/lib/auth";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await accounts.settings();
  return <SettingsForm catalog={catalog} />;
}
