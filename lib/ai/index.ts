import "server-only";
import { and, desc, gte, sql } from "drizzle-orm";
import { db, aiUsage } from "@/lib/db";
import { resolveConfig, upsertCredential } from "@/lib/credentials";
import { getAiProvider, AI_PROVIDERS, type ChatTurn, type Completion } from "./providers";

/**
 * The platform's language-model service.
 *
 * Configuration lives in the same encrypted credential store as every other
 * secret, and every call is logged — so "what is this costing" and "what did it
 * actually say" both have answers.
 */

export const AI_APP = "ai";

export interface AiSettings {
  provider: string;
  model: string;
  maxTokens: number;
  /** Master switch. Off means callers get a clear refusal, not a timeout. */
  enabled: boolean;
  /** Rough ceiling on spend, checked before each call. 0 = no limit. */
  dailyTokenBudget: number;
  config: Record<string, string>;
}

const DEFAULTS = {
  AI_PROVIDER: "offline",
  AI_MODEL: "",
  AI_MAX_TOKENS: "600",
  AI_ENABLED: "true",
  AI_DAILY_TOKEN_BUDGET: "0",
};

export async function aiSettings(): Promise<AiSettings> {
  const config = await resolveConfig(AI_APP);
  const get = (k: keyof typeof DEFAULTS) => config[k] ?? DEFAULTS[k];

  const provider = get("AI_PROVIDER");
  return {
    provider,
    model: get("AI_MODEL") || getAiProvider(provider).defaultModel,
    maxTokens: Number(get("AI_MAX_TOKENS")) || 600,
    enabled: get("AI_ENABLED") !== "false",
    dailyTokenBudget: Number(get("AI_DAILY_TOKEN_BUDGET")) || 0,
    config,
  };
}

export interface AiHealth {
  provider: string;
  providerName: string;
  model: string;
  enabled: boolean;
  ready: boolean;
  missing: string[];
  /** True when replies are canned rather than generated. */
  isOffline: boolean;
}

export async function aiHealth(): Promise<AiHealth> {
  const settings = await aiSettings();
  const provider = getAiProvider(settings.provider);
  const missing = provider.requires.filter((key) => !settings.config[key]);

  return {
    provider: provider.id,
    providerName: provider.name,
    model: settings.model,
    enabled: settings.enabled,
    ready: missing.length === 0,
    missing,
    isOffline: provider.id === "offline",
  };
}

export async function saveAiSettings(
  values: Record<string, string>,
  updatedBy: string,
): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    // A blank key means "leave it alone", so saving the form without retyping
    // the secret doesn't wipe a working one.
    if (key === "AI_API_KEY" && !value) continue;

    await upsertCredential({
      appId: AI_APP,
      key,
      value,
      secret: key === "AI_API_KEY",
      description: "Platform AI configuration",
      updatedBy,
    });
  }
}

export interface CompleteInput {
  app: string;
  purpose: string;
  messages: ChatTurn[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  reference?: string;
}

export interface CompleteResult extends Completion {
  ok: boolean;
  error?: string;
}

/** Tokens used today, for the budget check and the settings screen. */
export async function tokensToday(): Promise<number> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${aiUsage.tokensIn} + ${aiUsage.tokensOut}), 0)::int`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, midnight));

  return Number(row?.total ?? 0);
}

/**
 * Run a completion and log it.
 *
 * Never throws: a model outage must not take down whatever asked. Callers get
 * `ok: false` and decide what to do — support hands over to a human.
 */
export async function complete(input: CompleteInput): Promise<CompleteResult> {
  const settings = await aiSettings();
  const provider = getAiProvider(settings.provider);
  const started = Date.now();

  const fail = async (error: string): Promise<CompleteResult> => {
    await db.insert(aiUsage).values({
      app: input.app, purpose: input.purpose,
      provider: provider.id, model: settings.model,
      latencyMs: Date.now() - started, ok: false, error,
      reference: input.reference ?? null,
    });
    return { ok: false, error, text: "", model: settings.model, tokensIn: 0, tokensOut: 0 };
  };

  if (!settings.enabled) return fail("AI is switched off in admin settings");

  const missing = provider.requires.filter((key) => !settings.config[key]);
  if (missing.length) return fail(`${provider.name} is missing ${missing.join(", ")}`);

  if (settings.dailyTokenBudget > 0) {
    const used = await tokensToday();
    if (used >= settings.dailyTokenBudget) {
      return fail(`Daily token budget of ${settings.dailyTokenBudget.toLocaleString()} reached`);
    }
  }

  try {
    const result = await provider.complete(input.messages, settings.config, {
      model: input.model ?? settings.model,
      maxTokens: input.maxTokens ?? settings.maxTokens,
      temperature: input.temperature,
    });

    await db.insert(aiUsage).values({
      app: input.app, purpose: input.purpose,
      provider: provider.id, model: result.model,
      tokensIn: result.tokensIn, tokensOut: result.tokensOut,
      latencyMs: Date.now() - started, ok: true,
      reference: input.reference ?? null,
    });

    return { ok: true, ...result };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "The model provider failed");
  }
}

/* ------------------------------------------------------------------ reads */

export async function usageStats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  const [totals] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      failed: sql<number>`count(*) filter (where not ok)::int`,
      tokensIn: sql<number>`coalesce(sum(${aiUsage.tokensIn}), 0)::int`,
      tokensOut: sql<number>`coalesce(sum(${aiUsage.tokensOut}), 0)::int`,
      avgLatency: sql<number>`coalesce(avg(${aiUsage.latencyMs}), 0)::int`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since));

  const byApp = await db
    .select({
      app: aiUsage.app,
      purpose: aiUsage.purpose,
      calls: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${aiUsage.tokensIn} + ${aiUsage.tokensOut}), 0)::int`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since))
    .groupBy(aiUsage.app, aiUsage.purpose)
    .orderBy(sql`count(*) desc`);

  return {
    calls: Number(totals.calls),
    failed: Number(totals.failed),
    tokensIn: Number(totals.tokensIn),
    tokensOut: Number(totals.tokensOut),
    avgLatency: Number(totals.avgLatency),
    today: await tokensToday(),
    byApp: byApp.map((r) => ({
      app: r.app, purpose: r.purpose, calls: Number(r.calls), tokens: Number(r.tokens),
    })),
  };
}

export async function recentFailures(limit = 20) {
  return db.select().from(aiUsage)
    .where(and(sql`not ${aiUsage.ok}`))
    .orderBy(desc(aiUsage.createdAt))
    .limit(limit);
}

export { AI_PROVIDERS, getAiProvider, type ChatTurn };
