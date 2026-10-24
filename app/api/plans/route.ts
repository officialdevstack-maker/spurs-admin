import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { listPlans } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET /api/plans?app=<slug> -> active subscription plans for the app.
// Apps render these dynamically instead of hardcoding tiers.
function ok(req: NextRequest): boolean {
  const provided = req.headers.get("x-admin-bootstrap") ?? "";
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const app = req.nextUrl.searchParams.get("app") ?? "aitrader";
  const plans = await listPlans(app, true);
  return NextResponse.json({
    plans: plans.map((p) => ({
      code: p.code, name: p.name, priceMinorNgn: p.priceMinorNgn,
      tradeLimit: p.tradeLimit, tradePeriod: p.tradePeriod, features: p.features,
    })),
  });
}
