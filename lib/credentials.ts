import { db, credentials } from "@/lib/db";
import { and, eq, or } from "drizzle-orm";
import { encryptValue, decryptValue, maskValue } from "@/lib/crypto";

export interface CredentialView {
  id: string;
  appId: string;
  key: string;
  scope: string;
  secret: boolean;
  description: string | null;
  masked: string;
  updatedAt: Date;
  updatedBy: string | null;
}

/** All credentials, decrypted for masking (never send raw secrets to the browser). */
export async function listCredentials(appId?: string): Promise<CredentialView[]> {
  const rows = appId
    ? await db.select().from(credentials).where(eq(credentials.appId, appId))
    : await db.select().from(credentials);

  return rows
    .map((r) => ({
      id: r.id,
      appId: r.appId,
      key: r.key,
      scope: r.scope,
      secret: r.secret,
      description: r.description,
      masked: r.secret ? maskValue(safeDecrypt(r.valueEncrypted)) : safeDecrypt(r.valueEncrypted),
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
    }))
    .sort((a, b) => a.appId.localeCompare(b.appId) || a.key.localeCompare(b.key));
}

/** The full plaintext value — only for reveal / config resolution. */
export async function revealCredential(id: string): Promise<string | null> {
  const [row] = await db.select().from(credentials).where(eq(credentials.id, id)).limit(1);
  return row ? safeDecrypt(row.valueEncrypted) : null;
}

export async function upsertCredential(input: {
  appId: string;
  key: string;
  value: string;
  scope?: string;
  secret?: boolean;
  description?: string;
  updatedBy?: string;
}): Promise<void> {
  await db
    .insert(credentials)
    .values({
      appId: input.appId,
      key: input.key.trim(),
      scope: input.scope ?? "all",
      valueEncrypted: encryptValue(input.value),
      secret: input.secret ?? true,
      description: input.description ?? null,
      updatedBy: input.updatedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [credentials.appId, credentials.key, credentials.scope],
      set: {
        valueEncrypted: encryptValue(input.value),
        secret: input.secret ?? true,
        description: input.description ?? null,
        updatedBy: input.updatedBy ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function deleteCredential(id: string): Promise<void> {
  await db.delete(credentials).where(eq(credentials.id, id));
}

/**
 * Resolve an app's effective config: its own credentials layered over globals
 * (app-specific wins). Returns a plain key→value map — this is what the SDK
 * hands an app in place of its .env.
 */
export async function resolveConfig(appId: string): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(credentials)
    .where(or(eq(credentials.appId, "global"), eq(credentials.appId, appId)));

  const out: Record<string, string> = {};
  // globals first, then app-specific overrides
  for (const r of rows.filter((r) => r.appId === "global")) out[r.key] = safeDecrypt(r.valueEncrypted);
  for (const r of rows.filter((r) => r.appId === appId)) out[r.key] = safeDecrypt(r.valueEncrypted);
  return out;
}

function safeDecrypt(payload: string): string {
  try {
    return decryptValue(payload);
  } catch {
    return "";
  }
}
