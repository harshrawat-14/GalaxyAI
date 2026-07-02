import { type NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/apiAuth";
import { handleApiError, NotFoundError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { runId } = await params;

    const run = await prisma.workflowRun.findFirst({
      where: { id: runId, userId },
      include: { nodeExecutions: true },
    });
    if (!run) throw new NotFoundError("Run not found");

    return NextResponse.json(run);
  } catch (error) {
    return handleApiError(error);
  }
}
