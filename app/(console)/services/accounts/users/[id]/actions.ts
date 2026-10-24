"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { accounts } from "@/lib/sdk/accounts";

export async function assignRolesAction(userId: number, roles: string[]) {
  const admin = await assertPermission("customers.roles.assign");
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Array.isArray(roles) || roles.some((role) => typeof role !== "string")) {
    return { ok: false as const, error: "Invalid role update." };
  }
  try {
    const res = await accounts.assignRoles(userId, roles);
    await logAction(admin, "accounts.users.roles.assigned", `user:${userId}`, { roles });
    revalidatePath(`/services/accounts/users/${userId}`);
    revalidatePath(`/users/${userId}`);
    revalidatePath("/services/accounts");
    return { ok: true as const, roles: res.roles };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update roles" };
  }
}
