import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, admins } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";

export const SESSION_COOKIE = "admin_session";
const secret = () => new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET ?? "admin-dev-secret-change-me-32chars");

export interface AdminSession {
  id: string;
  email: string;
  name?: string;
  /** The role's slug. Roles are data now — this is no longer a closed set. */
  role: string;
}

export async function createAdminSession(a: AdminSession): Promise<string> {
  return new SignJWT({ email: a.email, name: a.name, role: a.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(a.id)
    .setIssuedAt()
    .setExpirationTime("12h") // control-plane sessions are short-lived
    .sign(secret());
}

export async function verifyAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      role: (payload.role as string) ?? "staff",
    };
  } catch {
    return null;
  }
}

/**
 * Cookie options for the shared console session.
 *
 * admin, team and support are three surfaces over one login. On localhost the
 * cookie is shared automatically because cookies ignore port numbers; across
 * subdomains in production it only works if the domain is set explicitly, so
 * ADMIN_COOKIE_DOMAIN (e.g. ".spurs.com.ng") must be set there or the other two
 * apps will bounce everyone back to the login screen.
 */
export function sessionCookieOptions() {
  const domain = process.env.ADMIN_COOKIE_DOMAIN;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
    ...(domain ? { domain } : {}),
  };
}

export async function getAdmin(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifyAdminSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<AdminSession> {
  const a = await getAdmin();
  if (!a) redirect("/login");
  return a;
}

export async function requireSuperadmin(): Promise<AdminSession> {
  const a = await requireAdmin();
  if (a.role !== "superadmin") redirect("/?error=forbidden");
  return a;
}

/**
 * The signed-in admin plus everything they're permitted to do.
 *
 * Permissions are resolved per request rather than baked into the session
 * token: a role edited at 10am must take effect at 10am, not whenever the
 * holder next signs in.
 */
export async function getAdminWithPermissions(): Promise<(AdminSession & { permissions: string[] | "*" }) | null> {
  const a = await getAdmin();
  if (!a) return null;
  const { permissionsForRole } = await import("@/lib/rbac");
  return { ...a, permissions: await permissionsForRole(a.role) };
}

/** True when the signed-in admin holds this permission. */
export async function can(permission: string): Promise<boolean> {
  const a = await getAdminWithPermissions();
  if (!a) return false;
  const { hasPermission } = await import("@/lib/permissions");
  return hasPermission(a.permissions, permission);
}

/**
 * Gate a page or action on a permission. This is the enforcement — hiding a
 * button in the UI is only a courtesy, and every action must call this again
 * even when the button that triggered it was already hidden.
 */
export async function requirePermission(permission: string): Promise<AdminSession> {
  const a = await requireAdmin();
  const { permissionsForRole } = await import("@/lib/rbac");
  const { hasPermission } = await import("@/lib/permissions");

  if (!hasPermission(await permissionsForRole(a.role), permission)) {
    redirect(`/?error=forbidden&needed=${encodeURIComponent(permission)}`);
  }
  return a;
}

/** Same check, for server actions that should throw rather than redirect. */
export async function assertPermission(permission: string): Promise<AdminSession> {
  const a = await getAdmin();
  if (!a) throw new Error("Not signed in");

  const { permissionsForRole } = await import("@/lib/rbac");
  const { hasPermission, permissionInfo } = await import("@/lib/permissions");

  if (!hasPermission(await permissionsForRole(a.role), permission)) {
    const info = permissionInfo(permission);
    throw new Error(`You don't have permission to ${info ? info.label.toLowerCase() : permission}`);
  }
  return a;
}

/** Verify email + password against the admins table. */
export async function authenticate(email: string, password: string): Promise<AdminSession | null> {
  await ensureBootstrapAdmin();
  const [row] = await db.select().from(admins).where(eq(admins.email, email.trim().toLowerCase())).limit(1);
  if (!row || !row.active || !verifyPassword(password, row.passwordHash)) return null;
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, row.id));
  return { id: row.id, email: row.email, name: row.name ?? undefined, role: row.role };
}

/** Seed the first superadmin from env if no admins exist yet. */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;

  const [existing] = await db.select({ id: admins.id }).from(admins).limit(1);
  if (existing) return;

  await db.insert(admins).values({
    email,
    name: "Super Admin",
    passwordHash: hashPassword(password),
    role: "superadmin",
  });
}
