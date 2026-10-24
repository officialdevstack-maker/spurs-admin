"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { accounts } from "@/lib/sdk/accounts";

function ok<T extends object>(v: T) { return { ok: true as const, ...v }; }
function fail(e: unknown) { return { ok: false as const, error: e instanceof Error ? e.message : "Request failed" }; }
function revalidate() {
  revalidatePath("/services/accounts/roles");
  revalidatePath("/services/accounts");
}

export async function createRoleAction(input: {
  name: string; label: string; description?: string; is_default: boolean; permissions: string[];
}) {
  const admin = await requireAdmin();
  try {
    const res = await accounts.createRole(input);
    await logAction(admin, "accounts.role.created", `role:${input.name}`, { permissions: input.permissions.length, is_default: input.is_default });
    revalidate();
    return ok({ id: res.id });
  } catch (e) { return fail(e); }
}

export async function updateRoleAction(id: number, name: string, input: {
  label?: string; description?: string; is_default?: boolean; permissions?: string[];
}) {
  const admin = await requireAdmin();
  try {
    await accounts.updateRole(id, input);
    await logAction(admin, "accounts.role.updated", `role:${name}`, input.permissions ? { permissions: input.permissions.length } : {});
    revalidate();
    return ok({});
  } catch (e) { return fail(e); }
}

export async function deleteRoleAction(id: number, name: string) {
  const admin = await requireAdmin();
  try {
    await accounts.deleteRole(id);
    await logAction(admin, "accounts.role.deleted", `role:${name}`);
    revalidate();
    return ok({});
  } catch (e) { return fail(e); }
}
