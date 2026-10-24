"use server";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { upsertCredential } from "@/lib/credentials";
import { logAction } from "@/lib/audit";

// The live processor is just a credential (PAY_PROVIDER). Admin is the source of
// truth; Pay picks it up once it reads config from the admin SDK.
export async function setProcessorAction(formData: FormData) {
  const admin = await requireSuperadmin();
  const provider = String(formData.get("provider") ?? "sandbox");
  await upsertCredential({ appId: "pay", key: "PAY_PROVIDER", value: provider, scope: "live", secret: false, updatedBy: admin.email });
  await logAction(admin, "pay.set_processor", provider);
  revalidatePath("/services/pay");
}
