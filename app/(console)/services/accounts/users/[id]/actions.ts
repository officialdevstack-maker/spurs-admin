"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { accounts } from "@/lib/sdk/accounts";

export async function assignRolesAction(userId: number, roles: string[]) {
  const admin = await requireAdmin();
  try {
    const res = await accounts.assignRoles(userId, roles);
    await logAction(admin, "accounts.user.roles_changed", `user:${userId}`, { roles });
    revalidatePath(`/services/accounts/users/${userId}`);
    revalidatePath("/services/accounts");
    return { ok: true as const, roles: res.roles };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update roles" };
  }
}
