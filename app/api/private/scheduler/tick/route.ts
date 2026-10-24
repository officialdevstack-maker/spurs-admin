import { NextResponse } from "next/server";
import { tick, health } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

/**
 * One tick of the platform scheduler.
 *
 * Call this every minute — from `scripts/scheduler.mjs`, a system cron, or a
 * platform scheduler. It works out what's actually due, so calling it more
 * often is harmless and calling it less just delays work.
 *
 * Safe to call concurrently: jobs are claimed atomically and every job is
 * idempotent.
 */
export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await tick();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    // Drizzle wraps the driver error and its message is just the SQL, which
    // says nothing about what went wrong. The useful text is on `cause`.
    const cause = (e as { cause?: { message?: string } })?.cause?.message;
    const message = e instanceof Error ? e.message : "Tick failed";
    return NextResponse.json(
      { error: cause ? `${cause}` : message, sql: cause ? message : undefined },
      { status: 500 },
    );
  }
}

/** Is the scheduler alive, and is anything overdue? */
export async function GET(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await health());
}
