import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodes: z.array(z.record(z.string(), z.unknown())).optional(),
  edges: z.array(z.record(z.string(), z.unknown())).optional(),
  viewport: z
    .object({ x: z.number(), y: z.number(), zoom: z.number() })
    .optional(),
})

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
  })

  if (!workflow)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(workflow)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await req.json()) as unknown
  const parsed = UpdateWorkflowSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    )

  // Verify ownership
  const existing = await prisma.workflow.findFirst({
    where: { id, userId },
  })
  if (!existing)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.nodes && {
        nodes: parsed.data.nodes as unknown as Prisma.InputJsonValue,
      }),
      ...(parsed.data.edges && {
        edges: parsed.data.edges as unknown as Prisma.InputJsonValue,
      }),
      ...(parsed.data.viewport && {
        viewport: parsed.data.viewport as unknown as Prisma.InputJsonValue,
      }),
    },
  })

  return NextResponse.json(workflow)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.workflow.findFirst({
    where: { id, userId },
  })
  if (!existing)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.workflow.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
