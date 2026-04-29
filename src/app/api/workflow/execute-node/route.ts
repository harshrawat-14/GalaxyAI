import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { llmChat } from '@/lib/llm-client'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { Prisma } from '@prisma/client'

const execAsync = promisify(exec)
const TMP = '/tmp/nextflow-uploads'

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
        const imageUrls = (inputs['images'] as string[]) ?? []

        const { text, isImage } = await llmChat({ model, systemPrompt, userMessage, imageUrls })

        result = { text, output: text, isImage: isImage ?? false }
        break
      }

      case 'crop-image': {
        const imageUrl =
          (inputs['image_url'] as string) ?? (nodeData['imageUrl'] as string)
        if (!imageUrl) throw new Error('No image URL provided for crop')

        // Parse percentages — coerce to numbers, default to full image if missing
        const xPct = Number(inputs['x_percent']      ?? nodeData['xPercent'])      || 0
        const yPct = Number(inputs['y_percent']      ?? nodeData['yPercent'])      || 0
        const wPct = Number(inputs['width_percent']  ?? nodeData['widthPercent'])  || 100
        const hPct = Number(inputs['height_percent'] ?? nodeData['heightPercent']) || 100

        let imgBuf: Buffer
        if (imageUrl.startsWith('data:')) {
          imgBuf = Buffer.from(imageUrl.split(',')[1] ?? '', 'base64')
        } else {
          imgBuf = Buffer.from(await (await fetch(imageUrl)).arrayBuffer())
        }

        const sharp = (await import('sharp')).default
        const img = sharp(imgBuf)
        const { width = 100, height = 100, format = 'jpeg' } = await img.metadata()

        const left = Math.max(0, Math.min(width  - 1, Math.round(width  * xPct / 100)))
        const top  = Math.max(0, Math.min(height - 1, Math.round(height * yPct / 100)))
        const cw   = Math.max(1, Math.min(width  - left, Math.round(width  * wPct / 100)))
        const ch   = Math.max(1, Math.min(height - top,  Math.round(height * hPct / 100)))

        if (xPct + wPct > 100 || yPct + hPct > 100) {
          throw new Error(
            `Crop window out of bounds: X%${xPct}+W%${wPct}=${xPct+wPct} or Y%${yPct}+H%${hPct}=${yPct+hPct} exceeds 100%. ` +
            `Reduce X%, Y%, or the width/height percentages so the crop fits inside the image.`,
          )
        }

        const cropped = await img.extract({ left, top, width: cw, height: ch }).toBuffer()
        const dataUrl = `data:image/${format};base64,${cropped.toString('base64')}`

        result = { resultUrl: dataUrl, output: dataUrl }
        break
      }

      case 'extract-frame': {
        const videoUrl =
          (inputs['video_url'] as string) ?? (nodeData['videoUrl'] as string)
        if (!videoUrl) throw new Error('No video URL provided for frame extraction')
        if (videoUrl.startsWith('blob:')) {
          throw new Error('Video has not been uploaded to the server yet. Please remove and re-add the video after reloading.')
        }

        const timestamp = String(inputs['timestamp'] ?? nodeData['timestamp'] ?? '0')

        // Use process.cwd() to avoid Turbopack's /ROOT path alias breaking ffmpeg-static
        const ffmpegBin = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')

        await mkdir(TMP, { recursive: true })
        const id      = randomBytes(8).toString('hex')
        const vidPath = join(TMP, `${id}.mp4`)
        const frmPath = join(TMP, `${id}.jpg`)

        // Read video from server-local URL or remote URL
        let vidBuf: Buffer
        if (videoUrl.startsWith('/api/file/')) {
          vidBuf = await readFile(join(TMP, videoUrl.replace('/api/file/', '')))
        } else if (videoUrl.startsWith('data:')) {
          vidBuf = Buffer.from(videoUrl.split(',')[1] ?? '', 'base64')
        } else {
          vidBuf = Buffer.from(await (await fetch(videoUrl)).arrayBuffer())
        }
        await writeFile(vidPath, vidBuf)

        // Resolve percentage timestamp → seconds
        let seekTime = timestamp.replace(/s$/i, '').trim()
        if (timestamp.endsWith('%')) {
          const pct = parseFloat(timestamp) / 100
          const { stdout } = await execAsync(
            `"${ffmpegBin}" -v error -show_entries format=duration -of csv=p=0 "${vidPath}"`,
          ).catch(() => ({ stdout: '0' }))
          const dur = parseFloat(stdout.trim()) || 0
          seekTime = String((dur * pct).toFixed(2))
        }

        await execAsync(
          `"${ffmpegBin}" -ss ${seekTime} -i "${vidPath}" -frames:v 1 -q:v 2 "${frmPath}" -y`,
        )

        const frameBuf = await readFile(frmPath)
        const dataUrl  = `data:image/jpeg;base64,${frameBuf.toString('base64')}`
        await Promise.allSettled([unlink(vidPath), unlink(frmPath)])

        result = { resultUrl: dataUrl, output: dataUrl }
        break
      }

      default:
        throw new Error(`Unknown node type: ${nodeType}`)
    }

    const durationMs = Date.now() - startTime

    // Update NodeRun with success — strip base64 blobs before storing
    await prisma.nodeRun.update({
      where: { id: nodeRun.id },
      data: {
        status: 'SUCCESS',
        outputs: stripBlobs(result) as unknown as Prisma.InputJsonValue,
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
