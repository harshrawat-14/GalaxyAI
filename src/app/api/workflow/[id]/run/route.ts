import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const RunWorkflowSchema = z.object({
  scope: z.enum(['FULL', 'PARTIAL', 'SINGLE']),
  selectedNodeIds: z.array(z.string()).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await req.json()) as unknown
  const parsed = RunWorkflowSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    )

  // Verify ownership
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
  })
  if (!workflow)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: id,
      userId,
      status: 'RUNNING',
      scope: parsed.data.scope,
      selectedNodeIds: parsed.data.selectedNodeIds ?? [],
    },
  })

  return NextResponse.json({ runId: run.id }, { status: 201 })
}
