"use server";

import { getAdminWithPermissions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { searchCommandEntities } from "@/lib/command-search";

export async function searchCommandPalette(query: string) {
  const admin = await getAdminWithPermissions();
  if (!admin) throw new Error("Sign in to search the console.");

  return searchCommandEntities(query, {
    customers: hasPermission(admin.permissions, "customers.read"),
    money: hasPermission(admin.permissions, "money.read"),
  });
}
