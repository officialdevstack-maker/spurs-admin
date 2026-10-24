import { walletSettingsCatalog } from "@/lib/wallet-settings";
import { requirePermission } from "@/lib/auth";
import WalletSettingsForm from "./WalletSettingsForm";

export const dynamic = "force-dynamic";

export default async function WalletSettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await walletSettingsCatalog();
  return <WalletSettingsForm catalog={catalog} />;
}
