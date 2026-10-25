import { WALLET_ASSET_OPTIONS, walletSettingsCatalog } from "@/lib/wallet-settings";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import SettingsForm from "@/components/settings/SettingsForm";
import { saveWalletSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function WalletSettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await walletSettingsCatalog();
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet settings" description="Configure supported assets, transfers, fees, bonuses, and custody integrations." />
      <SettingsForm
        catalog={catalog}
        saveAction={saveWalletSettingsAction}
        description="Stored in the admin config registry for Wallet. Secret inputs are blank; leave them blank to keep the current value."
        successMessage="Saved — served to Wallet from admin config."
        options={{ WALLET_ENABLED_ASSETS: WALLET_ASSET_OPTIONS }}
      />
    </div>
  );
}
