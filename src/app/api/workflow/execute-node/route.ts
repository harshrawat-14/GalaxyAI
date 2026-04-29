import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import '@/lib/trigger-client'
import type { Prisma } from '@prisma/client'

const ExecuteNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  nodeData: z.record(z.string(), z.unknown()),
  inputs: z.record(z.string(), z.unknown()),
  runId: z.string(),
})

const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

/** Make /api/file/... paths absolute so the Trigger.dev worker can fetch them */
function toAbsoluteUrl(url: string, origin: string): string {
  if (url.startsWith('/api/file/')) return `${origin}${url}`
  return url
}

async function triggerAndAwait<TOutput>(
  taskId: string,
  payload: unknown,
): Promise<{ output: TOutput; triggerRunId: string }> {
  const handle = await tasks.trigger(taskId, payload)

  const pollPromise = runs.poll(handle.id, { pollIntervalMs: POLL_INTERVAL_MS })
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Trigger.dev task ${taskId} timed out after ${POLL_TIMEOUT_MS}ms`)),
      POLL_TIMEOUT_MS,
    ),
  )
  const completed = await Promise.race([pollPromise, timeoutPromise])

  if (completed.status !== 'COMPLETED') {
    const errMessage = completed.error?.message ?? 'Task did not complete successfully'
    throw new Error(`[${completed.status}] ${errMessage}`)
  }

  return { output: completed.output as TOutput, triggerRunId: handle.id }
}

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
  const origin = req.headers.get('origin') ?? `http://localhost:${process.env.PORT ?? 3000}`
  const startTime = Date.now()

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
    let triggerRunId: string | null = null

    switch (nodeType) {
      // ── Lightweight passthroughs (no Trigger.dev needed) ──────
      case 'text': {
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

      // ── Heavy ops dispatched to Trigger.dev ───────────────────
      case 'llm': {
        const model =
          (inputs['model'] as string) ??
          (nodeData['model'] as string) ??
          'gemini-2.5-flash'
        const systemPrompt =
          (inputs['system_prompt'] as string) ??
          (nodeData['systemPrompt'] as string) ??
          ''
        const userMessage =
          (inputs['user_message'] as string) ??
          (nodeData['userMessage'] as string) ??
          ''
        const rawImages = (inputs['images'] as string[]) ?? []
        const imageUrls = rawImages.map((u) => toAbsoluteUrl(u, origin))

        const { output, triggerRunId: trid } = await triggerAndAwait<{
          text: string
          isImage: boolean
          nodeRunId: string
        }>('llm-task', {
          model,
          systemPrompt,
          userMessage,
          imageUrls,
          nodeRunId: nodeRun.id,
        })
        triggerRunId = trid
        result = { text: output.text, output: output.text, isImage: output.isImage }
        break
      }

      case 'crop-image': {
        const rawUrl =
          (inputs['image_url'] as string) ?? (nodeData['imageUrl'] as string)
        if (!rawUrl) throw new Error('No image URL provided for crop')
        const imageUrl = toAbsoluteUrl(rawUrl, origin)

        const xPercent = Number(inputs['x_percent'] ?? nodeData['xPercent']) || 0
        const yPercent = Number(inputs['y_percent'] ?? nodeData['yPercent']) || 0
        const widthPercent = Number(inputs['width_percent'] ?? nodeData['widthPercent']) || 100
        const heightPercent = Number(inputs['height_percent'] ?? nodeData['heightPercent']) || 100

        const { output, triggerRunId: trid } = await triggerAndAwait<{
          resultUrl: string
          nodeRunId: string
        }>('crop-image-ffmpeg', {
          imageUrl,
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
          nodeRunId: nodeRun.id,
        })
        triggerRunId = trid
        result = { resultUrl: output.resultUrl, output: output.resultUrl }
        break
      }

      case 'extract-frame': {
        const rawUrl =
          (inputs['video_url'] as string) ?? (nodeData['videoUrl'] as string)
        if (!rawUrl) throw new Error('No video URL provided for frame extraction')
        const videoUrl = toAbsoluteUrl(rawUrl, origin)
        const timestamp = String(inputs['timestamp'] ?? nodeData['timestamp'] ?? '0')

        const { output, triggerRunId: trid } = await triggerAndAwait<{
          resultUrl: string
          nodeRunId: string
        }>('extract-frame-ffmpeg', {
          videoUrl,
          timestamp,
          nodeRunId: nodeRun.id,
        })
        triggerRunId = trid
        result = { resultUrl: output.resultUrl, output: output.resultUrl }
        break
      }

      default:
        throw new Error(`Unknown node type: ${nodeType}`)
    }

    const durationMs = Date.now() - startTime

    await prisma.nodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: 'SUCCESS',
        outputs: stripBlobs(result) as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
        durationMs,
        ...(triggerRunId ? { triggerRunId } : {}),
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown execution error'

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

function stripBlobs(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] =
      typeof v === 'string' && v.startsWith('data:') && v.length > 512
        ? '[binary]'
        : v
  }
  return out
}

