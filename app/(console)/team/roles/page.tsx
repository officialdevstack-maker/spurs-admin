import { requirePermission, can } from "@/lib/auth";
import { listRoles } from "@/lib/rbac";
import RolesManager, { type RoleRow } from "./RolesManager";

export const dynamic = "force-dynamic";

export default async function Roles() {
  await requirePermission("console.access");
  const [roles, canManage] = await Promise.all([listRoles(), can("console.roles.manage")]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-muted-foreground text-sm">
          What console staff are allowed to do. Roles are data — change one and it takes effect on the
          holder's next request, with no deploy.
        </p>
      </div>

      <RolesManager
        canManage={canManage}
        roles={roles.map((r): RoleRow => ({
          slug: r.role.slug,
          label: r.role.label,
          description: r.role.description,
          isSystem: r.role.isSystem,
          isDefault: r.role.isDefault,
          permissions: r.permissions,
          admins: r.admins,
        }))}
      />
    </div>
  );
}
