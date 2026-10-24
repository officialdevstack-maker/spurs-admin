import { paySettingsCatalog } from "@/lib/pay-settings";
import { requirePermission } from "@/lib/auth";
import PaySettingsForm from "./PaySettingsForm";

export const dynamic = "force-dynamic";

export default async function PaySettingsPage() {
  await requirePermission("platform.settings.manage");
  const catalog = await paySettingsCatalog();
  return <PaySettingsForm catalog={catalog} />;
}
