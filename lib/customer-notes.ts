import "server-only";
import { desc, eq } from "drizzle-orm";
import { customerNotes, db } from "@/lib/db";

export async function listCustomerNotes(userId: string) {
  return db.select().from(customerNotes)
    .where(eq(customerNotes.userId, userId))
    .orderBy(desc(customerNotes.pinned), desc(customerNotes.createdAt));
}
