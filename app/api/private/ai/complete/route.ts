import { NextResponse } from "next/server";
import { z } from "zod";
import { complete, aiHealth } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Language-model completions, for every Spurs app.
 *
 * Apps never hold a model vendor's API key — they post messages here, exactly
 * as they post templates to the mailer. One key, one usage log, one switch.
 *
 * Prompts stay with the caller: they're product logic, and support's assistant
 * needs a very different prompt from a fraud summariser.
 */
const Body = z.object({
  app: z.string().min(1),
  /** What this call is for — support.assistant, fraud.summary … */
  purpose: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1),
  })).min(1),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  reference: z.string().max(200).optional(),
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

  // A failed completion is reported, not thrown: the caller decides what to do,
  // and support's answer is to hand the customer to a human.
  const result = await complete(parsed.data);
  return NextResponse.json(result);
}

/** Whether the assistant can actually answer right now. */
export async function GET(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await aiHealth());
}
