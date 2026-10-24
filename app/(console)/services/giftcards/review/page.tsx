import { giftcards } from "@/lib/sdk/giftcards";
import { can, requirePermission } from "@/lib/auth";
import ReviewQueue from "./ReviewQueue";

export const dynamic = "force-dynamic";

export default async function Review() {
  await requirePermission("ops.review");
  const [rows, canApprove, canReveal] = await Promise.all([
    giftcards.reviewQueue(),
    can("money.payouts.approve"),
    can("ops.cards.reveal"),
  ]);
  return <ReviewQueue rows={rows} canApprove={canApprove} canReveal={canReveal} />;
}
