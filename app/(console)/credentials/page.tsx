import { requirePermission } from "@/lib/auth";
import { listCredentials } from "@/lib/credentials";
import { db, apps as appsTable } from "@/lib/db";
import CredentialsManager from "./CredentialsManager";

export default async function CredentialsPage() {
  const admin = await requirePermission("platform.credentials.manage");
  const [creds, apps] = await Promise.all([
    listCredentials(),
    db.select({ id: appsTable.id, name: appsTable.name }).from(appsTable),
  ]);

  const serialized = creds.map((c) => ({
    id: c.id, appId: c.appId, key: c.key, scope: c.scope, secret: c.secret,
    description: c.description, masked: c.masked, updatedBy: c.updatedBy,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Credentials</h1>
        <p className="text-muted-foreground text-sm">
          The single source of truth. Every app reads its config from here via the admin SDK — no more per-app <code>.env</code>.
        </p>
      </div>
      <CredentialsManager credentials={serialized} apps={apps} canDelete={admin.role === "superadmin"} />
    </div>
  );
}
