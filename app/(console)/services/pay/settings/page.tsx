import { PAYMENT_METHOD_OPTIONS, paySettingsCatalog } from "@/lib/pay-settings";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import SettingsForm from "@/components/settings/SettingsForm";
import { savePaySettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PaySettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await paySettingsCatalog();
  return (
    <div className="space-y-6">
      <PageHeader title="Pay settings" description="Configure payment methods, fees, risk thresholds, and reference formats." />
      <SettingsForm
        catalog={catalog}
        saveAction={savePaySettingsAction}
        description="Stored in the admin config registry for Pay and served over the config API."
        successMessage="Saved — served to Pay from admin config."
        options={{ PAY_ALLOWED_METHODS: PAYMENT_METHOD_OPTIONS }}
      />
    </div>
  );
}
