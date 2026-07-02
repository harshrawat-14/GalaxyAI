import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Empirically observed free-tier daily request limit for the default Gemini
 * model (confirmed live, repeatedly, via real 429 responses during this
 * project's test passes — `"quotaValue":"20"` for gemini-2.5-flash-lite).
 * Google publishes no stable per-model SLA for this, so this is a working
 * approximation, not an authoritative figure — exactly why the "Bal" pill
 * this backs is labeled a proxy, never an exact balance (out-of-PS scope
 * warning, docs/UI_PARITY_FIXES.md).
 */
export const DAILY_REQUEST_LIMIT = 20;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * +1 to today's run counter for this user. Called once per run created
 * (not once per Gemini call within that run) — a deliberate simplification
 * named in the feature's own DoD, not an oversight.
 */
export async function incrementDailyUsage(
  tx: Pick<PrismaClient, "dailyUsageCounter"> | Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  const date = todayUtc();
  await tx.dailyUsageCounter.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });
}

export interface DailyUsage {
  used: number;
  dailyLimit: number;
  remaining: number;
}

/** Reads today's usage for the "Bal" pill — 0 used if no runs yet today. */
export async function getDailyUsage(
  client: Pick<PrismaClient, "dailyUsageCounter">,
  userId: string,
): Promise<DailyUsage> {
  const date = todayUtc();
  const row = await client.dailyUsageCounter.findUnique({ where: { userId_date: { userId, date } } });
  const used = row?.count ?? 0;
  return { used, dailyLimit: DAILY_REQUEST_LIMIT, remaining: Math.max(0, DAILY_REQUEST_LIMIT - used) };
}
