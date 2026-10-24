import { survey } from "@/lib/sdk/survey";
import EarnersTable from "./EarnersTable";

export const dynamic = "force-dynamic";

export default async function Earners() {
  const rows = await survey.earners(200);
  return <EarnersTable rows={rows} />;
}
