import { accounts } from "@/lib/sdk/accounts";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage() {
  const catalog = await accounts.settings();
  return <SettingsForm catalog={catalog} />;
}
