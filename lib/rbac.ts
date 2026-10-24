import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db, adminRoles, adminRolePermissions, type AdminRole } from "@/lib/db";
import { ALL_PERMISSION_KEYS, SYSTEM_ROLES, hasPermission } from "@/lib/permissions";

/**
 * Resolving what a console user may do.
 *
 * Superadmin is a wildcard rather than a stored list of grants: a role whose
 * meaning is "everything" must keep meaning that when a new permission ships,
 * otherwise adding a permission silently locks the owner out of the feature
 * they just deployed.
 *
 * Everything is checked server-side. The client-side helpers in
 * lib/permissions.ts only hide UI — they are never the enforcement.
 */

/** Permissions a role grants. `"*"` is the superadmin wildcard. */
export async function permissionsForRole(slug: string): Promise<string[] | "*"> {
  if (slug === "superadmin") return "*";

  const rows = await db.select({ key: adminRolePermissions.permissionKey })
    .from(adminRolePermissions)
    .where(eq(adminRolePermissions.roleSlug, slug));

  return rows.map((r) => r.key);
}

export interface RoleWithPermissions {
  role: AdminRole;
  permissions: string[] | "*";
  /** How many admins currently hold it. */
  admins: number;
}

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const roles = await db.select().from(adminRoles).orderBy(asc(adminRoles.slug));
  const slugs = roles.map((r) => r.slug);

  const grants = slugs.length
    ? await db.select().from(adminRolePermissions).where(inArray(adminRolePermissions.roleSlug, slugs))
    : [];

  const counts = await db.execute<{ role: string; count: number }>(
    // Admins carry the role slug directly; there's no join table for it.
    // eslint-disable-next-line
    (await import("drizzle-orm")).sql`select role, count(*)::int as count from admin.admins group by role`,
  );
  const byRole = new Map(Array.from(counts.rows).map((c) => [c.role, Number(c.count)]));

  return roles.map((role) => ({
    role,
    permissions: role.slug === "superadmin"
      ? "*"
      : grants.filter((g) => g.roleSlug === role.slug).map((g) => g.permissionKey),
    admins: byRole.get(role.slug) ?? 0,
  }));
}

export async function getRole(slug: string): Promise<RoleWithPermissions | null> {
  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1);
  if (!role) return null;
  return { role, permissions: await permissionsForRole(slug), admins: 0 };
}

export interface RoleInput {
  slug: string;
  label: string;
  description?: string | null;
  permissions: string[];
  isDefault?: boolean;
}

function validate(input: RoleInput) {
  if (!/^[a-z][a-z0-9_-]{1,30}$/.test(input.slug)) {
    throw new Error("Slug must be lowercase letters, numbers, dashes or underscores");
  }
  if (!input.label.trim()) throw new Error("Give the role a name");

  const unknown = input.permissions.filter((p) => !ALL_PERMISSION_KEYS.includes(p));
  if (unknown.length) {
    // A permission nothing checks would grant nothing while looking like it did.
    throw new Error(`Unknown permission(s): ${unknown.join(", ")}`);
  }
}

export async function createRole(input: RoleInput, by: string): Promise<AdminRole> {
  validate(input);

  if (SYSTEM_ROLES.some((r) => r.slug === input.slug)) {
    throw new Error("That slug is reserved by a built-in role");
  }

  const [role] = await db.insert(adminRoles).values({
    slug: input.slug,
    label: input.label.trim(),
    description: input.description?.trim() || null,
    isSystem: false,
    isDefault: input.isDefault ?? false,
  }).returning();

  await setGrants(role.slug, input.permissions);
  if (input.isDefault) await makeDefault(role.slug);
  void by;
  return role;
}

export async function updateRole(slug: string, input: Omit<RoleInput, "slug">): Promise<AdminRole> {
  validate({ ...input, slug });

  const [existing] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1);
  if (!existing) throw new Error("Role not found");

  // Superadmin's grants are the wildcard; letting someone edit them would be a
  // way to quietly remove their own ability to undo it.
  if (slug === "superadmin") {
    throw new Error("Superadmin always holds every permission and can't be edited");
  }

  const [role] = await db.update(adminRoles).set({
    label: input.label.trim(),
    description: input.description?.trim() || null,
    isDefault: input.isDefault ?? existing.isDefault,
  }).where(eq(adminRoles.slug, slug)).returning();

  await setGrants(slug, input.permissions);
  if (input.isDefault) await makeDefault(slug);
  return role;
}

export async function deleteRole(slug: string): Promise<void> {
  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.slug, slug)).limit(1);
  if (!role) throw new Error("Role not found");
  if (role.isSystem) throw new Error("Built-in roles can't be deleted");

  const holders = await db.execute<{ count: number }>(
    (await import("drizzle-orm")).sql`select count(*)::int as count from admin.admins where role = ${slug}`,
  );
  if (Number(Array.from(holders.rows)[0]?.count ?? 0) > 0) {
    throw new Error("Move the admins holding this role to another one first");
  }

  await db.delete(adminRolePermissions).where(eq(adminRolePermissions.roleSlug, slug));
  await db.delete(adminRoles).where(eq(adminRoles.slug, slug));
}

/** Replace a role's grants wholesale — simplest thing that stays consistent. */
async function setGrants(slug: string, permissions: string[]): Promise<void> {
  await db.delete(adminRolePermissions).where(eq(adminRolePermissions.roleSlug, slug));
  const unique = [...new Set(permissions)];
  if (!unique.length) return;

  await db.insert(adminRolePermissions)
    .values(unique.map((permissionKey) => ({ roleSlug: slug, permissionKey })))
    .onConflictDoNothing();
}

/** Exactly one role is the default for new admins. */
async function makeDefault(slug: string): Promise<void> {
  await db.update(adminRoles).set({ isDefault: false });
  await db.update(adminRoles).set({ isDefault: true }).where(eq(adminRoles.slug, slug));
}

export async function defaultRoleSlug(): Promise<string> {
  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.isDefault, true)).limit(1);
  return role?.slug ?? "staff";
}

/** Re-export so callers need only one import for a check. */
export { hasPermission };
