import { listUsers } from "@/lib/data";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import Notice from "@/components/page/Notice";
import { requirePermission } from "@/lib/auth";
import { accounts } from "@/lib/sdk/accounts";
import UsersTable from "./UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission("customers.read");
  const [platformResult, accountsResult] = await Promise.allSettled([
    listUsers(500),
    accounts.users(),
  ]);
  if (platformResult.status === "rejected") {
    console.error("Customer directory could not load platform users", platformResult.reason);
  }
  if (accountsResult.status === "rejected") {
    console.error("Customer directory could not load Accounts users", accountsResult.reason);
  }

  const platformUsers = platformResult.status === "fulfilled" ? platformResult.value : [];
  const accountUsers = accountsResult.status === "fulfilled" ? accountsResult.value : [];
  const accountById = new Map(accountUsers.map((user) => [String(user.id), user]));
  const platformIds = new Set(platformUsers.map((user) => user.id));
  const users = [
    ...platformUsers.map((user) => ({ ...user, account: accountById.get(user.id) })),
    ...accountUsers
      .filter((user) => !platformIds.has(String(user.id)))
      .map((user) => ({
        id: String(user.id),
        name: user.name,
        email: user.email,
        hasWallet: false,
        isMerchant: false,
        projects: 0,
        account: user,
      })),
  ];
  const serviceErrors = [
    ...(platformResult.status === "rejected" ? ["the platform customer database"] : []),
    ...(accountsResult.status === "rejected" ? ["Accounts"] : []),
  ];
  const roles = Array.from(
    new Map(accountUsers.flatMap((user) => user.roles).map((role) => [role.name, role.label])).entries(),
  ).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`One customer directory across platform services and Accounts. ${users.length} total.`} />
      {serviceErrors.length > 0 && (
        <Notice tone="warning" title="Some customer data is unavailable.">
          Couldn&apos;t reach {serviceErrors.join(" and ")}. Check the service connection and try again.
        </Notice>
      )}
      {users.length > 0
        ? <UsersTable data={users} roles={roles} />
        : <EmptyState
            title={serviceErrors.length > 0 ? "Customer data is unavailable" : "No customers yet"}
            description={serviceErrors.length > 0
              ? "Check the platform database and Accounts service connections, then try again."
              : "Customers will appear here when they create a Spurs account."}
          />}
    </div>
  );
}
