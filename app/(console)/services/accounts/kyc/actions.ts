"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { accounts } from "@/lib/sdk/accounts";

export async function reviewKycAction(id: number, decision: "approve" | "reject", level?: number, reason?: string) {
  const admin = await assertPermission("customers.kyc.review");
  try {
    const res = await accounts.reviewKyc(id, { decision, level, reason, reviewer: admin.email });
    await logAction(admin, `accounts.kyc.${decision === "approve" ? "approved" : "rejected"}`, `kyc:${id}`, { level, reason });
    revalidatePath("/services/accounts/kyc");
    revalidatePath("/services/accounts");
    return { ok: true as const, status: res.status, level: res.level };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Review failed" };
  }
}
