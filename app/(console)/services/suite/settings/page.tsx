import { suiteSettingsCatalog } from "@/lib/suite-settings";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import SettingsForm from "@/components/settings/SettingsForm";
import { saveSuiteSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SuiteSettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await suiteSettingsCatalog();
  const settings = Object.fromEntries(
    Object.entries(catalog).map(([group, items]) => [
      group,
      items.map((item) => item.key === "SUITE_INDUSTRIES" ? { ...item, rows: 8 } : item),
    ]),
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Suite settings" description="Configure Suite defaults, fees, payroll, team limits, and integrations." />
      <SettingsForm
        catalog={settings}
        saveAction={saveSuiteSettingsAction}
        description="Stored in the admin config registry for Suite. Secret fields are blank; leave them blank to keep the current value."
        successMessage="Saved — served to Suite from admin config."
      />
    </div>
  );
}
