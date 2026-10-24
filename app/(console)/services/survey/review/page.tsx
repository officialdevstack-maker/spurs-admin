import { survey } from "@/lib/sdk/survey";
import { requirePermission } from "@/lib/auth";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function Review() {
  await requirePermission("ops.review");
  const rows = await survey.reviewQueue();
  return <ReviewQueue rows={rows} />;
}
