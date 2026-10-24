"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { runNow, setJobEnabled, setJobInterval } from "@/lib/scheduler";

const err = (e: unknown) => (e instanceof Error ? e.message : "Action failed");

export async function runJobAction(key: string) {
  const admin = await assertPermission("platform.scheduler.manage");
  try {
    const result = await runNow(key);
    await logAction(admin, "scheduler.run", `${key}: ${result.summary}`);
    revalidatePath("/scheduler");
    return { ok: result.ok, summary: result.summary };
  } catch (e) {
    return { ok: false, summary: err(e) };
  }
}

export async function toggleJobAction(key: string, enabled: boolean) {
  const admin = await assertPermission("platform.scheduler.manage");
  try {
    await setJobEnabled(key, enabled);
    await logAction(admin, enabled ? "scheduler.resume" : "scheduler.pause", key);
    revalidatePath("/scheduler");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}

export async function setIntervalAction(key: string, seconds: number) {
  const admin = await assertPermission("platform.scheduler.manage");
  try {
    await setJobInterval(key, seconds);
    await logAction(admin, "scheduler.interval", `${key} → ${seconds}s`);
    revalidatePath("/scheduler");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: err(e) };
  }
}
