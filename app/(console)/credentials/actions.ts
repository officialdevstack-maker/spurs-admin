"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperadmin } from "@/lib/auth";
import { upsertCredential, deleteCredential, revealCredential } from "@/lib/credentials";
import { logAction } from "@/lib/audit";

export async function saveCredentialAction(formData: FormData) {
  const admin = await requireAdmin();
  const appId = String(formData.get("appId") ?? "global");
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  const scope = String(formData.get("scope") ?? "all");
  const secret = formData.get("secret") !== "off";
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!key || !value) return;

  await upsertCredential({ appId, key, value, scope, secret, description, updatedBy: admin.email });
  await logAction(admin, "credential.upsert", `${appId}:${key}`, { scope });
  revalidatePath("/credentials");
}

export async function deleteCredentialAction(id: string) {
  const admin = await requireSuperadmin();
  await deleteCredential(id);
  await logAction(admin, "credential.delete", id);
  revalidatePath("/credentials");
}

export async function revealCredentialAction(id: string): Promise<string | null> {
  const admin = await requireAdmin();
  const value = await revealCredential(id);
  await logAction(admin, "credential.reveal", id);
  return value;
}
