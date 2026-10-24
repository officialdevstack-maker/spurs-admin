import { walletSettingsCatalog } from "@/lib/wallet-settings";
import WalletSettingsForm from "./WalletSettingsForm";

export const dynamic = "force-dynamic";

export default async function WalletSettingsPage() {
  const catalog = await walletSettingsCatalog();
  return <WalletSettingsForm catalog={catalog} />;
}
