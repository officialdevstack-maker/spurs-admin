import { accounts } from "@/lib/sdk/accounts";
import AccountsUsersTable from "./AccountsUsersTable";

export const dynamic = "force-dynamic";

export default async function AccountsUsersPage() {
  const [users, roles] = await Promise.all([accounts.users(), accounts.roles()]);
  const roleOptions = roles.map((r) => ({ label: r.label, value: r.name }));

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{users.length} accounts. Roles assigned here take effect across every Spurs Cloud service.</p>
      <AccountsUsersTable data={users} roleOptions={roleOptions} />
    </div>
  );
}
