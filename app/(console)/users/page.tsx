import { listUsers } from "@/lib/data";
import PageHeader from "@/components/page/PageHeader";
import { requirePermission } from "@/lib/auth";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  await requirePermission("customers.read");
  const users = await listUsers(500);
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description={`Every Spurs account and where they're active. ${users.length} total.`} />
      <UsersTable data={users} />
    </div>
  );
}
