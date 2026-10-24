"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { db, customerNotes } from "@/lib/db";
import { accounts } from "@/lib/sdk/accounts";

const fail = (error: unknown) => ({
  ok: false as const,
  error: error instanceof Error ? error.message : "The action failed. Try again.",
});

export async function addCustomerNoteAction(userId: string, body: string) {
  const admin = await assertPermission("customers.read");
  if (!userId.trim() || userId.length > 255) {
    return { ok: false as const, error: "Invalid customer ID." };
  }
  const note = body.trim();
  if (!note) return { ok: false as const, error: "Write a note before saving." };
  if (note.length > 2000) return { ok: false as const, error: "Notes must be 2,000 characters or fewer." };

  try {
    const [created] = await db.insert(customerNotes).values({
      userId,
      body: note,
      createdBy: admin.email,
    }).returning({ id: customerNotes.id });
    await logAction(admin, "customer.note.add", userId, { noteId: created.id });
    revalidatePath(`/users/${encodeURIComponent(userId)}`);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function setCustomerNotePinnedAction(noteId: string, pinned: boolean) {
  const admin = await assertPermission("customers.read");
  if (!noteId.trim() || typeof pinned !== "boolean") {
    return { ok: false as const, error: "Invalid note update." };
  }

  try {
    const [note] = await db.update(customerNotes)
      .set({ pinned, updatedAt: new Date() })
      .where(eq(customerNotes.id, noteId))
      .returning({ id: customerNotes.id, userId: customerNotes.userId });
    if (!note) return { ok: false as const, error: "This note no longer exists." };

    await logAction(admin, "customer.note.pin", note.userId, { noteId: note.id, pinned });
    revalidatePath(`/users/${encodeURIComponent(note.userId)}`);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function setCustomerSuspensionAction(
  userId: number,
  suspended: boolean,
  reason: string,
) {
  const admin = await assertPermission("customers.suspend");
  if (!Number.isSafeInteger(userId) || userId <= 0 || typeof suspended !== "boolean") {
    return { ok: false as const, error: "Invalid account update." };
  }
  const normalizedReason = reason.trim();
  if (suspended && !normalizedReason) {
    return { ok: false as const, error: "Provide a reason for suspending this account." };
  }
  if (normalizedReason.length > 500) {
    return { ok: false as const, error: "The reason must be 500 characters or fewer." };
  }

  try {
    const result = await accounts.setSuspension(userId, suspended, normalizedReason || undefined);
    await logAction(
      admin,
      suspended ? "customer.suspended" : "customer.reinstated",
      `account:${userId}`,
      { reason: normalizedReason || undefined },
    );
    revalidatePath(`/users/${userId}`);
    return { ok: true as const, suspendedAt: result.suspended_at, reason: result.suspension_reason };
  } catch (error) {
    return fail(error);
  }
}
