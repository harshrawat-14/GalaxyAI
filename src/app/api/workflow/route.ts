import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
  viewport: z
    .object({ x: z.number(), y: z.number(), zoom: z.number() })
    .optional(),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, updatedAt: true, createdAt: true },
  })

  return NextResponse.json(workflows)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as unknown
  const parsed = CreateWorkflowSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    )

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: parsed.data.name,
      nodes: parsed.data.nodes as unknown as Prisma.InputJsonValue,
      edges: parsed.data.edges as unknown as Prisma.InputJsonValue,
      viewport: (parsed.data.viewport as unknown as Prisma.InputJsonValue) ?? {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
  })

  return NextResponse.json(workflow, { status: 201 })
}
