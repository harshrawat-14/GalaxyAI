import { type NextRequest, NextResponse } from "next/server";
import type { WorkflowGraph } from "@/domain/types";
import { requireUserId } from "@/lib/apiAuth";
import { BadRequestError, handleApiError, NotFoundError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
// Side-effect import: configures the Trigger.dev SDK client from our
// TRIGGER_API_KEY env var. The SDK only auto-detects TRIGGER_SECRET_KEY, so
// without this, orchestrate.trigger() below throws an auth error the moment
// this route actually runs — must come before any SDK call in this module.
import "@/lib/trigger-client";
import { orchestrate } from "@/trigger/orchestrate";
import { runTag } from "@/trigger/runTag";

type RouteParams = { params: Promise<{ runId: string }> };

/**
 * Second phase of starting a run: the client calls this only after it has
 * already enabled its realtime subscription (scoped to the run's tag,
 * returned by POST /api/workflows/[id]/runs). This ordering — subscribe,
 * then trigger — is what guarantees the canvas glow can't miss a fast
 * node's running -> success transition.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { runId } = await params;

    const run = await prisma.workflowRun.findFirst({ where: { id: runId, userId } });
    if (!run) throw new NotFoundError("Run not found");
    if (run.triggerRunId) throw new BadRequestError("Run has already been started");

    const nodeExecutions = await prisma.nodeExecution.findMany({
      where: { runId: run.id },
      select: { id: true, nodeId: true },
    });
    const scope = nodeExecutions.map((ne) => ne.nodeId);
    const nodeExecutionIdByNodeId = Object.fromEntries(nodeExecutions.map((ne) => [ne.nodeId, ne.id]));

    const handle = await orchestrate.trigger(
      {
        runId: run.id,
        workflowId: run.workflowId,
        scope,
        graph: run.graph as unknown as WorkflowGraph,
        nodeExecutionIdByNodeId,
      },
      { tags: [runTag(run.id)] },
    );

    await prisma.workflowRun.update({ where: { id: run.id }, data: { triggerRunId: handle.id } });

    return NextResponse.json({ triggerRunId: handle.id });
  } catch (error) {
    return handleApiError(error);
  }
}
