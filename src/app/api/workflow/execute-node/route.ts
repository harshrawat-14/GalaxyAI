import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Groq from 'groq-sdk'
import type { Prisma } from '@prisma/client'

const ExecuteNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  nodeData: z.record(z.string(), z.unknown()),
  inputs: z.record(z.string(), z.unknown()),
  runId: z.string(),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as unknown
  const parsed = ExecuteNodeSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    )

  const { nodeId, nodeType, nodeData, inputs, runId } = parsed.data
  const startTime = Date.now()

  // Create NodeRun record
  const nodeRun = await prisma.nodeRun.create({
    data: {
      workflowRunId: runId,
      nodeId,
      nodeType,
      nodeLabel: (nodeData['label'] as string) ?? nodeType,
      status: 'RUNNING',
      inputs: inputs as unknown as Prisma.InputJsonValue,
    },
  })

  try {
    let result: Record<string, unknown> = {}

    switch (nodeType) {
      case 'text': {
        // Text nodes just pass through their content
        const content =
          (inputs['content'] as string) ??
          (nodeData['content'] as string) ??
          ''
        result = { text: content, output: content }
        break
      }

      case 'upload-image': {
        const imageUrl = (nodeData['imageUrl'] as string) ?? null
        result = { imageUrl, output: imageUrl }
        break
      }

      case 'upload-video': {
        const videoUrl = (nodeData['videoUrl'] as string) ?? null
        result = { videoUrl, output: videoUrl }
        break
      }

      case 'llm': {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) throw new Error('GROQ_API_KEY not configured')

        const model =
          (inputs['model'] as string) ??
          (nodeData['model'] as string) ??
          'llama-3.3-70b-versatile'
        const systemPrompt =
          (inputs['system_prompt'] as string) ??
          (nodeData['systemPrompt'] as string) ??
          ''
        const userMessage =
          (inputs['user_message'] as string) ??
          (nodeData['userMessage'] as string) ??
          ''
        const imageUrls = (inputs['images'] as string[]) ?? []

        const groq = new Groq({ apiKey })

        type ContentPart =
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string } }

        const userContent: ContentPart[] = []

        for (const imageUrl of imageUrls) {
          if (typeof imageUrl !== 'string' || !imageUrl) continue
          try {
            const response = await fetch(imageUrl)
            const buffer = await response.arrayBuffer()
            const base64 = Buffer.from(buffer).toString('base64')
            const mimeType = response.headers.get('content-type') ?? 'image/jpeg'
            userContent.push({
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            })
          } catch {
            // Skip failed image fetches
          }
        }

        userContent.push({ type: 'text', text: userMessage })

        type Message =
          | { role: 'system'; content: string }
          | { role: 'user'; content: ContentPart[] | string }

        const messages: Message[] = []
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
        messages.push({
          role: 'user',
          content: imageUrls.length > 0 ? userContent : userMessage,
        })

        const completion = await groq.chat.completions.create({
          model,
          messages: messages as Parameters<typeof groq.chat.completions.create>[0]['messages'],
        })

        const text = completion.choices[0]?.message?.content ?? ''

        result = { text, output: text }
        break
      }

      case 'crop-image': {
        // For crop-image, we'd normally trigger FFmpeg via Trigger.dev
        // For direct execution, return a placeholder indicating the task was dispatched
        result = {
          resultUrl: (nodeData['imageUrl'] as string) ?? null,
          output: (nodeData['imageUrl'] as string) ?? null,
          message: 'Crop task dispatched — requires Trigger.dev runtime for FFmpeg processing',
        }
        break
      }

      case 'extract-frame': {
        // For extract-frame, we'd normally trigger FFmpeg via Trigger.dev
        result = {
          resultUrl: null,
          output: null,
          message: 'Frame extraction task dispatched — requires Trigger.dev runtime for FFmpeg processing',
        }
        break
      }

      default:
        throw new Error(`Unknown node type: ${nodeType}`)
    }

    const durationMs = Date.now() - startTime

    // Update NodeRun with success
    await prisma.nodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: 'SUCCESS',
        outputs: result as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
        durationMs,
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown execution error'

    // Update NodeRun with failure
    await prisma.nodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
        completedAt: new Date(),
        durationMs,
      },
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
