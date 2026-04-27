import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateRunSchema = z.object({
  status: z.enum(['SUCCESS', 'FAILED', 'PARTIAL']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, runId } = await params
  const body = (await req.json()) as unknown
  const parsed = UpdateRunSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const run = await prisma.workflowRun.findFirst({
    where: { id: runId, workflowId: id, userId },
    select: { id: true, startedAt: true },
  })
  if (!run)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const completedAt = new Date()
  const durationMs = completedAt.getTime() - run.startedAt.getTime()

  const updated = await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: parsed.data.status, completedAt, durationMs },
  })

  return NextResponse.json(updated)
}
