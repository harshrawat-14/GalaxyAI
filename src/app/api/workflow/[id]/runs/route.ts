import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const STALE_RUN_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
    select: { id: true },
  })
  if (!workflow)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Auto-fail any RUNNING runs older than 10 min — these are leftovers from
  // crashes or pre-PATCH-endpoint code paths and would otherwise pin polling
  // at the 3s "active" cadence forever.
  const staleCutoff = new Date(Date.now() - STALE_RUN_MS)
  await prisma.workflowRun.updateMany({
    where: {
      workflowId: id,
      userId,
      status: 'RUNNING',
      startedAt: { lt: staleCutoff },
    },
    data: { status: 'FAILED', completedAt: new Date() },
  })

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: id, userId },
    orderBy: { startedAt: 'desc' },
    take: 20,
    include: {
      nodeRuns: {
        orderBy: { startedAt: 'asc' },
      },
    },
  })

  return NextResponse.json(runs)
}
