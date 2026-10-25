"use server";

import { assertPermission } from "@/lib/auth";
import { SUITE_SETTING_TYPES, SUITE_SECRET_KEYS } from "@/lib/suite-settings";
import { saveCredentialSettings } from "@/lib/save-credential-settings";

export async function saveSuiteSettingsAction(values: Record<string, boolean | number | string>) {
  const admin = await assertPermission("platform.settings.manage");
  return saveCredentialSettings({
    admin,
    appId: "suite",
    settingTypes: SUITE_SETTING_TYPES,
    secretKeys: SUITE_SECRET_KEYS,
    values,
    description: "Suite platform setting",
    action: "suite.settings.updated",
    target: "suite",
    path: "/services/suite/settings",
  });
}
