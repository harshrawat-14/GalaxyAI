import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { getDailyUsage } from "@/lib/usageCounter";

/** Backs the top-bar "Bal" pill — see src/lib/usageCounter.ts for what this proxy actually measures. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const usage = await getDailyUsage(prisma, userId);
    return NextResponse.json(usage);
  } catch (error) {
    return handleApiError(error);
  }
}
