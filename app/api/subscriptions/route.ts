import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getPayment } from "@/lib/pay";
import { getSubscription, setSubscription } from "@/lib/subscriptions";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Subscriptions for paid apps. Apps read a user's plan (GET) and finalize an
// upgrade (POST) after the user pays via Spurs Pay's hosted checkout (methods:
// Spurs Wallet, gift card, card). Admin verifies the Pay payment before recording
// the plan — admin is the source of truth. Authenticated with the shared
// bootstrap secret, like /api/config.
function ok(req: NextRequest): boolean {
  const provided = req.headers.get("x-admin-bootstrap") ?? "";
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// GET /api/subscriptions?app=<slug>&user=<sub>  ->  { plan, active, renewsAt }
export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const app = req.nextUrl.searchParams.get("app");
  const user = req.nextUrl.searchParams.get("user");
  if (!app || !user) return NextResponse.json({ error: "Missing app/user" }, { status: 400 });
  return NextResponse.json(await getSubscription(app, user));
}

// POST /api/subscriptions
//   { reference }            -> verify Pay payment, record plan from its metadata
//   { app, user, plan }      -> direct grant (admin/manual, or free)
export async function POST(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  // 1) Finalize a paid subscription by its Spurs Pay reference.
  if (body?.reference) {
    const payment = await getPayment(String(body.reference));
    if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
    if (payment.status !== "successful") {
      return NextResponse.json({ error: "Payment not completed", status: payment.status }, { status: 402 });
    }
    const meta = payment.metadata ?? {};
    const app = String(meta.app ?? "");
    const user = String(meta.user ?? "");
    const plan = String(meta.plan ?? "");
    const def = app && plan ? await getPlan(app, plan) : null;
    if (!app || !user || !def) return NextResponse.json({ error: "Bad payment metadata" }, { status: 400 });
    await setSubscription({
      appId: app, userId: user, plan, active: true, renewsAt: new Date(Date.now() + THIRTY_DAYS),
      tradeLimit: def.tradeLimit, tradePeriod: def.tradePeriod,
    });
    return NextResponse.json({ ok: true, plan, active: true, message: `Subscribed to ${def.name}.` });
  }

  // 2) Direct grant (free plan, or an admin manually setting a plan).
  const { app, user, plan } = body as { app?: string; user?: string; plan?: string };
  const def = app && plan ? await getPlan(app, plan) : null;
  if (!app || !user || !def) return NextResponse.json({ error: "Missing app/user/plan" }, { status: 400 });
  const paid = def.priceMinorNgn > 0;
  await setSubscription({
    appId: app, userId: user, plan: plan!, active: paid,
    renewsAt: paid ? new Date(Date.now() + THIRTY_DAYS) : null,
    tradeLimit: def.tradeLimit, tradePeriod: def.tradePeriod,
  });
  return NextResponse.json({ ok: true, plan, active: paid });
}
