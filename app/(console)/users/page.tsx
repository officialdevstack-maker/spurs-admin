import { listUsers } from "@/lib/data";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  const users = await listUsers(500);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">Every Spurs account and where they’re active. {users.length} total.</p>
      </div>
      <UsersTable data={users} />
    </div>
  );
}
