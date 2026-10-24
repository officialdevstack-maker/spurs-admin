import { NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/mail/send";
import { getTemplate } from "@/lib/mail/templates";

export const dynamic = "force-dynamic";

/**
 * Platform mail, for every Spurs app.
 *
 * Apps never hold SMTP credentials or render their own templates — they post a
 * template key and a context here. That keeps the credentials in one place, the
 * house style consistent, and gives support one log to search when someone says
 * "I never got the email".
 *
 * Pass `idempotencyKey` whenever the caller might retry: sending is idempotent
 * on it, so a replayed job can't email someone twice.
 */
const Body = z.object({
  app: z.string().min(1),
  template: z.string().min(1),
  to: z.string().email(),
  context: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
});

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  if (!getTemplate(body.template)) {
    return NextResponse.json({ error: `Unknown template "${body.template}"` }, { status: 400 });
  }

  const outcome = await sendMail(body);

  // A delivery failure is reported, not thrown: the caller's own operation
  // (a signup, a payout) must not fail because an email did.
  return NextResponse.json({
    ok: outcome.status === "sent" || outcome.status === "duplicate",
    ...outcome,
  });
}

/** The templates an app may send, so callers can discover them. */
export async function GET(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { TEMPLATES } = await import("@/lib/mail/templates");
  return NextResponse.json({
    templates: TEMPLATES.map((t) => ({
      key: t.key, label: t.label, description: t.description, variables: t.variables,
    })),
  });
}
