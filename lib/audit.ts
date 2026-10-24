import { db, auditLog } from "@/lib/db";
import type { AdminSession } from "@/lib/auth";

export async function logAction(admin: AdminSession, action: string, target?: string, meta?: Record<string, unknown>) {
  await db.insert(auditLog).values({
    adminId: admin.id,
    adminEmail: admin.email,
    action,
    target: target ?? null,
    meta: meta ?? null,
  });
}
