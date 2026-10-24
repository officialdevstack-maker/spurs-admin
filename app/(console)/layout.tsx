import { redirect } from "next/navigation";
import { getAdminWithPermissions } from "@/lib/auth";
import { getInboxQueueCounts } from "@/lib/inbox";
import ShellFrame from "@/components/shell/ShellFrame";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminWithPermissions();
  if (!admin) redirect("/login");
  const inbox = await getInboxQueueCounts(admin.permissions);

  return (
    <ShellFrame admin={{ email: admin.email, role: admin.role, permissions: admin.permissions }} inbox={inbox}>
      {children}
    </ShellFrame>
  );
}
