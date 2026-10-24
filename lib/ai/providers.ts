import "server-only";

/**
 * Language models, as a platform service.
 *
 * Abstracted the same way payment processors and mail providers are, and for
 * the same reason: the thing answering customers at 2am must be swappable from
 * a settings screen, not a deploy. OpenAI is what's wired up today; adding
 * another means implementing this interface and registering it below.
 *
 * Apps don't hold API keys and don't talk to model vendors directly — they post
 * messages to admin's `/api/private/ai/complete`, exactly as they post templates
 * to the mailer. That keeps the key in one place, gives one usage log to check
 * when the bill arrives, and means support's assistant, fraud summaries and
 * whatever comes next all share one switch.
 *
 * Prompts deliberately stay with the app that owns the conversation: they're
 * product logic, not infrastructure.
 */

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Completion {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

export interface AiProvider {
  id: string;
  name: string;
  /** Settings keys it needs before it can answer anything. */
  requires: string[];
  defaultModel: string;
  complete(
    messages: ChatTurn[],
    config: Record<string, string>,
    opts?: { model?: string; maxTokens?: number; temperature?: number },
  ): Promise<Completion>;
}

/* ----------------------------------------------------------------- openai */

const openai: AiProvider = {
  id: "openai",
  name: "OpenAI",
  requires: ["AI_API_KEY"],
  defaultModel: "gpt-4o-mini",

  async complete(messages, config, opts = {}) {
    const model = opts.model ?? config.AI_MODEL ?? this.defaultModel;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        // Support answers should be boring and repeatable, not creative.
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 600,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error?.message ?? `OpenAI returned ${res.status}`);
    }

    return {
      text: body?.choices?.[0]?.message?.content?.trim() ?? "",
      model: body?.model ?? model,
      tokensIn: body?.usage?.prompt_tokens ?? 0,
      tokensOut: body?.usage?.completion_tokens ?? 0,
    };
  },
};

/* ------------------------------------------------------------------- echo */

/**
 * Development default. Returns a canned reply without calling anything, so
 * callers can be built and tested before a key exists — and so a missing key
 * degrades to something honest rather than a stack trace in someone's face.
 */
const offline: AiProvider = {
  id: "offline",
  name: "Offline (no model)",
  requires: [],
  defaultModel: "offline",

  async complete(messages) {
    // Callers that ground their prompts (support does) pass context in the
    // system turn. Saying so plainly beats pretending to have an answer.
    const grounded = (messages.find((m) => m.role === "system")?.content ?? "").includes("ARTICLE ");

    return {
      text: grounded
        ? "No language model is connected yet, so I can't summarise what I found. " +
          "The relevant help articles are listed below, and I can pass this to a person if they don't help."
        : "No language model is connected yet, so I can't answer that here. " +
          "Let me pass this to someone who can help.\n[[HANDOVER]]",
      model: "offline",
      tokensIn: 0,
      tokensOut: 0,
    };
  },
};

export const AI_PROVIDERS: AiProvider[] = [offline, openai];

const BY_ID = new Map(AI_PROVIDERS.map((p) => [p.id, p]));
export const getAiProvider = (id: string): AiProvider => BY_ID.get(id) ?? offline;
