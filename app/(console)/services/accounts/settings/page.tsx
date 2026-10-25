import { accounts } from "@/lib/sdk/accounts";
import { requirePermission } from "@/lib/auth";
import PageHeader from "@/components/page/PageHeader";
import SettingsForm from "@/components/settings/SettingsForm";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await accounts.settings();
  return (
    <div className="space-y-6">
      <PageHeader title="Accounts settings" description="Configure account verification, identity, and security behavior." />
      <SettingsForm
        catalog={catalog}
        saveAction={saveSettingsAction}
        description="These settings control the identity provider directly. Live settings take effect on the next request."
        successMessage="Settings saved — live across the identity platform."
      />
    </div>
  );
}
