"use server";

import { assertPermission } from "@/lib/auth";
import { WALLET_SECRET_KEYS, WALLET_SETTING_TYPES } from "@/lib/wallet-settings";
import { saveCredentialSettings } from "@/lib/save-credential-settings";

export async function saveWalletSettingsAction(values: Record<string, boolean | number | string>) {
  const admin = await assertPermission("platform.settings.manage");
  return saveCredentialSettings({
    admin,
    appId: "wallet",
    settingTypes: WALLET_SETTING_TYPES,
    secretKeys: WALLET_SECRET_KEYS,
    values,
    description: "Wallet platform setting",
    action: "wallet.settings.updated",
    target: "wallet",
    path: "/services/wallet/settings",
  });
}
