import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";

export default async function AccountUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers.read");
  const { id } = await params;
  redirect(`/users/${id}`);
}
