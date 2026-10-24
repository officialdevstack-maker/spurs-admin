import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { resolveConfig } from "@/lib/credentials";

// GET /api/config?app=<slug>
// Apps read their effective configuration here instead of from .env, using the
// shared bootstrap secret. Returns { config: { KEY: value, ... } }.
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

  const app = req.nextUrl.searchParams.get("app");
  if (!app) return NextResponse.json({ error: "Missing app" }, { status: 400 });

  return NextResponse.json({ app, config: await resolveConfig(app) });
}
