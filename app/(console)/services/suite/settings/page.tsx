import { suiteSettingsCatalog } from "@/lib/suite-settings";
import SuiteSettingsForm from "./SuiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function SuiteSettingsPage() {
  const catalog = await suiteSettingsCatalog();
  return <SuiteSettingsForm catalog={catalog} />;
}
