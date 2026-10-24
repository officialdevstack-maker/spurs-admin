import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = NextResponse.redirect(`${process.env.APP_URL ?? "http://localhost:3300"}/login`);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
