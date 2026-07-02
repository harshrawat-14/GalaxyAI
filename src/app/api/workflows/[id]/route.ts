import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { validateGraph } from "@/domain/dag";
import { updateWorkflowSchema, workflowGraphSchema } from "@/domain/schema";
import type { WorkflowGraph } from "@/domain/types";
import { requireUserId } from "@/lib/apiAuth";
import { BadRequestError, ConflictError, handleApiError, NotFoundError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// Workflow rows persisted before a field was added to WorkflowGraph (e.g.
// `stickyNotes`, `locked`) store the older shape verbatim — re-parsing
// through the schema here (not just at write time) backfills its defaults
// before the client ever sees it, instead of crashing on a missing array.
function normalizeGraph<T extends { graph: unknown }>(workflow: T): T {
  return { ...workflow, graph: workflowGraphSchema.parse(workflow.graph) };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) throw new NotFoundError("Workflow not found");

    return NextResponse.json(normalizeGraph(workflow));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = updateWorkflowSchema.parse(await req.json());

    const data: Prisma.WorkflowUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
    if (body.graph !== undefined) {
      // Never trust client-supplied connections — re-check the same rules the
      // canvas enforces per-drag (AGENT.md §3, §6).
      const validation = validateGraph(body.graph as WorkflowGraph);
      if (!validation.ok) throw new BadRequestError(validation.reason);
      data.graph = body.graph as unknown as Prisma.InputJsonValue;
    }

    // Optimistic concurrency: only write if `graphVersion` hasn't moved since
    // the client last saw it (LLD §3 autosave). Zero rows affected => stale.
    // Uses `graphVersion`, not `updatedAt` — the latter is also bumped by
    // run-status transitions (idle <-> running) unrelated to the graph,
    // which previously caused a 409 on the next autosave after any run.
    const where = body.expectedVersion !== undefined
      ? { id, userId, graphVersion: body.expectedVersion }
      : { id, userId };
    data.graphVersion = { increment: 1 };

    const result = await prisma.workflow.updateMany({ where, data });

    if (result.count === 0) {
      const exists = await prisma.workflow.findFirst({ where: { id, userId } });
      if (!exists) throw new NotFoundError("Workflow not found");
      throw new ConflictError("Workflow was modified elsewhere — refetch and retry");
    }

    const workflow = await prisma.workflow.findFirstOrThrow({ where: { id, userId } });
    return NextResponse.json(normalizeGraph(workflow));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const result = await prisma.workflow.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundError("Workflow not found");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
