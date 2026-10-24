import { giftcards } from "@/lib/sdk/giftcards";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function Review() {
  const rows = await giftcards.reviewQueue();
  return <ReviewQueue rows={rows} />;
}
