import { notFound } from "next/navigation";
import { accounts } from "@/lib/sdk/accounts";
import { requirePermission } from "@/lib/auth";
import RoleForm from "../../RoleForm";

export const dynamic = "force-dynamic";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("console.roles.manage");
  const { id } = await params;
  const [roles, catalog] = await Promise.all([accounts.roles(), accounts.permissions()]);
  const role = roles.find((r) => r.id === Number(id));
  if (!role) notFound();
  return <RoleForm role={role} catalog={catalog} />;
}
