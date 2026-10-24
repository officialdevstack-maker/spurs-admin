import { survey } from "@/lib/sdk/survey";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function Review() {
  const rows = await survey.reviewQueue();
  return <ReviewQueue rows={rows} />;
}
