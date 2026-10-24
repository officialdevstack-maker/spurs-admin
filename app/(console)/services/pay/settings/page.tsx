import { paySettingsCatalog } from "@/lib/pay-settings";
import PaySettingsForm from "./PaySettingsForm";

export const dynamic = "force-dynamic";

export default async function PaySettingsPage() {
  const catalog = await paySettingsCatalog();
  return <PaySettingsForm catalog={catalog} />;
}
