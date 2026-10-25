"use server";

import { assertPermission } from "@/lib/auth";
import { PAY_SETTING_TYPES } from "@/lib/pay-settings";
import { saveCredentialSettings } from "@/lib/save-credential-settings";

export async function savePaySettingsAction(values: Record<string, boolean | number | string>) {
  const admin = await assertPermission("platform.settings.manage");
  return saveCredentialSettings({
    admin,
    appId: "pay",
    settingTypes: PAY_SETTING_TYPES,
    values,
    description: "Pay platform setting",
    action: "pay.settings.updated",
    target: "pay",
    path: "/services/pay/settings",
  });
}
