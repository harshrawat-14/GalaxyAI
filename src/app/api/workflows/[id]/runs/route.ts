import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { validateGraph } from "@/domain/dag";
import { runRequestSchema } from "@/domain/schema";
import type { WorkflowGraph } from "@/domain/types";
import { requireUserId } from "@/lib/apiAuth";
import { BadRequestError, handleApiError, NotFoundError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { incrementDailyUsage } from "@/lib/usageCounter";
// Side-effect import: configures the Trigger.dev SDK client from our
// TRIGGER_API_KEY env var (the SDK only auto-detects TRIGGER_SECRET_KEY) —
// must come before createPublicToken() below.
import "@/lib/trigger-client";
import { runTag } from "@/trigger/runTag";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const workflow = await prisma.workflow.findFirst({ where: { id, userId }, select: { id: true } });
    if (!workflow) throw new NotFoundError("Workflow not found");

    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: "desc" },
      include: { nodeExecutions: true },
    });
    return NextResponse.json(runs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = runRequestSchema.parse(await req.json());

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) throw new NotFoundError("Workflow not found");

    const graph = body.graph as WorkflowGraph;
    const validation = validateGraph(graph);
    if (!validation.ok) throw new BadRequestError(validation.reason);

    const scope = body.scope === "full" ? graph.nodes.map((n) => n.id) : body.nodeIds;
    if (scope.length === 0) throw new BadRequestError("Run scope is empty");

    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    for (const nodeId of scope) {
      if (!nodeById.has(nodeId)) throw new BadRequestError(`Run scope references unknown node "${nodeId}"`);
    }

    // Create the run row (with the graph snapshot it will execute against)
    // but do NOT trigger the Trigger.dev task yet — the client must establish
    // its realtime subscription first (see /api/runs/[runId]/start). Trigger.dev
    // rejects concurrent triggerAndWait, but more relevantly here: if we
    // triggered before the client subscribes, fast nodes (e.g. a quick Gemini
    // call) can transition running -> success before the subscription's
    // initial snapshot is even fetched, so the glow is silently missed.
    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.workflowRun.create({
        data: {
          workflowId: id,
          userId,
          scope: body.scope,
          status: "running",
          graph: graph as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.nodeExecution.createMany({
        data: scope.map((nodeId) => ({
          runId: created.id,
          nodeId,
          nodeKind: nodeById.get(nodeId)!.kind,
          status: "pending",
        })),
      });
      await tx.workflow.update({ where: { id }, data: { status: "running" } });
      // +1 to the "Bal" pill's proxy counter — once per run, not once per
      // Gemini call inside it (see src/lib/usageCounter.ts).
      await incrementDailyUsage(tx, userId);
      return created;
    });

    const tag = runTag(run.id);
    const publicToken = await triggerAuth.createPublicToken({
      scopes: { read: { tags: [tag] } },
    });

    return NextResponse.json({ runId: run.id, tag, publicToken }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
