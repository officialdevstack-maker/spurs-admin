import "server-only";
import { resolveConfig, upsertCredential } from "@/lib/credentials";
import { getProvider, PROVIDERS } from "./providers";

/**
 * Mail configuration, held in the same encrypted credential store as every
 * other platform secret. Admin is the source of truth (see the platform rule
 * in `spurs-cloud-admin-owns-config`) — no app carries SMTP credentials in its
 * own environment.
 */

export const MAIL_APP = "mail";

export interface MailSettings {
  provider: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  /** Base URL used to build links in emails. */
  appUrl: string;
  /** Send everything here instead of the real recipient. For staging. */
  redirectTo: string;
  /** Master switch. Off means log-and-skip, never a silent failure. */
  enabled: boolean;
  /** Provider-specific values (host, port, api key …). */
  config: Record<string, string>;
}

const DEFAULTS = {
  MAIL_PROVIDER: "log",
  MAIL_FROM: "no-reply@spurs.com.ng",
  MAIL_FROM_NAME: "Spurs",
  MAIL_REPLY_TO: "",
  MAIL_APP_URL: "https://spurs.com.ng",
  MAIL_REDIRECT_TO: "",
  MAIL_ENABLED: "true",
};

export async function getMailSettings(): Promise<MailSettings> {
  const config = await resolveConfig(MAIL_APP);
  const get = (k: keyof typeof DEFAULTS) => config[k] ?? DEFAULTS[k];
  const providerValue = String(get("MAIL_PROVIDER") ?? "").trim();
  const provider = providerValue && PROVIDERS.some((p) => p.id === providerValue)
    ? providerValue
    : DEFAULTS.MAIL_PROVIDER;

  return {
    provider,
    fromEmail: get("MAIL_FROM"),
    fromName: get("MAIL_FROM_NAME"),
    replyTo: get("MAIL_REPLY_TO"),
    appUrl: get("MAIL_APP_URL"),
    redirectTo: get("MAIL_REDIRECT_TO"),
    enabled: get("MAIL_ENABLED") !== "false",
    config,
  };
}

/** Which settings the chosen provider still needs before it can send. */
export async function missingSettings(): Promise<string[]> {
  const settings = await getMailSettings();
  const provider = getProvider(settings.provider);
  return provider.requires.filter((key) => !settings.config[key]);
}

export interface MailHealth {
  provider: string;
  providerName: string;
  ready: boolean;
  enabled: boolean;
  missing: string[];
  /** True when mail is going nowhere real — worth saying loudly in the UI. */
  isDevelopmentOnly: boolean;
}

export async function mailHealth(): Promise<MailHealth> {
  const settings = await getMailSettings();
  const provider = getProvider(settings.provider);
  const missing = provider.requires.filter((key) => !settings.config[key]);

  return {
    provider: provider.id,
    providerName: provider.name,
    ready: missing.length === 0,
    enabled: settings.enabled,
    missing,
    isDevelopmentOnly: provider.id === "log",
  };
}

/** Persist settings. Secrets are stored encrypted and never read back to the UI. */
export async function saveMailSettings(
  values: Record<string, string>,
  updatedBy: string,
): Promise<void> {
  const SECRET_KEYS = new Set(["MAIL_PASSWORD", "MAIL_API_KEY"]);
  const existing = await getMailSettings();

  const requestedProvider = String(values.MAIL_PROVIDER ?? "").trim();
  if (requestedProvider && PROVIDERS.some((p) => p.id === requestedProvider)) {
    values.MAIL_PROVIDER = requestedProvider;
  } else {
    values.MAIL_PROVIDER = existing.provider;
  }

  for (const [key, value] of Object.entries(values)) {
    // A blank secret means "leave it alone", so saving the form without
    // retyping a password doesn't wipe a working one.
    if (SECRET_KEYS.has(key) && !value) continue;

    await upsertCredential({
      appId: MAIL_APP,
      key,
      value,
      secret: SECRET_KEYS.has(key),
      description: "Platform mail configuration",
      updatedBy,
    });
  }
}

export { PROVIDERS, getProvider };
