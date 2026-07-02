import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createWorkflowSchema } from "@/domain/schema";
import type { WorkflowGraph } from "@/domain/types";
import { requireUserId } from "@/lib/apiAuth";
import { handleApiError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { createSeedGraph } from "@/lib/seed";

export async function GET() {
  try {
    const userId = await requireUserId();
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, createdAt: true, updatedAt: true, graph: true, coverImageUrl: true },
    });
    // Only the node count/kinds leave this endpoint for the dashboard card
    // thumbnail — the full graph payload isn't needed for a list view.
    const summaries = workflows.map(({ graph, ...rest }) => {
      const nodes = (graph as unknown as WorkflowGraph).nodes;
      return { ...rest, nodeCount: nodes.length, nodeKinds: [...new Set(nodes.map((n) => n.kind))] };
    });
    return NextResponse.json(summaries);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = createWorkflowSchema.parse(await req.json().catch(() => ({})));

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: body.name,
        graph: createSeedGraph() as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
