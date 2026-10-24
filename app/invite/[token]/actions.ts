"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { acceptInvite } from "@/lib/teams";
import { createAdminSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { logAction } from "@/lib/audit";

/**
 * Accept an invitation. Public by design — the token is the only credential,
 * which is why it's random, single-use, short-lived and stored hashed.
 */
export async function acceptInviteAction(token: string, name: string, password: string) {
  try {
    const admin = await acceptInvite(token, name, password);

    await logAction(
      { id: admin.id, email: admin.email, role: admin.role },
      "team.invite_accepted",
      admin.email,
    );

    // Sign them straight in — a fresh account bounced to a login form is a
    // pointless extra step.
    const session = await createAdminSession({
      id: admin.id, email: admin.email, name: admin.name ?? undefined, role: admin.role,
    });
    const store = await cookies();
    store.set(SESSION_COOKIE, session, sessionCookieOptions());
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not accept the invitation" };
  }
  redirect("/");
}
