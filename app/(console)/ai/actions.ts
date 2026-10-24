"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { saveAiSettings, complete } from "@/lib/ai";

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

export async function saveAiAction(formData: FormData) {
  const admin = await assertPermission("platform.ai.manage");

  const values: Record<string, string> = {};
  for (const key of ["AI_PROVIDER", "AI_MODEL", "AI_MAX_TOKENS", "AI_API_KEY", "AI_DAILY_TOKEN_BUDGET"]) {
    const value = formData.get(key);
    if (value !== null) values[key] = String(value);
  }
  values.AI_ENABLED = formData.get("AI_ENABLED") === "on" ? "true" : "false";

  await saveAiSettings(values, admin.email);
  await logAction(admin, "ai.settings", `provider=${values.AI_PROVIDER}, enabled=${values.AI_ENABLED}`);
  revalidatePath("/ai");
}

/**
 * Send one real prompt. The only honest check — a saved settings form proves
 * nothing until a model actually answers.
 */
export async function testAiAction(prompt: string) {
  const admin = await assertPermission("platform.ai.manage");
  try {
    const result = await complete({
      app: "admin",
      purpose: "admin.test",
      messages: [
        { role: "system", content: "You are being tested from the Spurs admin console. Reply in one short sentence." },
        { role: "user", content: prompt || "Say hello and name the model you are." },
      ],
      maxTokens: 120,
    });
    await logAction(admin, "ai.test", result.ok ? result.model : (result.error ?? "failed"));
    revalidatePath("/ai");
    return result.ok
      ? { ok: true as const, text: result.text, model: result.model, tokens: result.tokensIn + result.tokensOut }
      : { ok: false as const, error: result.error ?? "The model didn't answer" };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
