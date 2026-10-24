"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, createAdminSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { permissionsForRole } from "@/lib/rbac";
import { canOpenInbox } from "@/lib/workspaces";

export async function loginAction(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const admin = await authenticate(email, password);
  if (!admin) return { error: "Invalid email or password." };

  const token = await createAdminSession(admin);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  const permissions = await permissionsForRole(admin.role);
  redirect(canOpenInbox(permissions) ? "/inbox" : "/");
}
