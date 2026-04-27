import { task, logger } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const ExtractFrameSchema = z.object({
  videoUrl: z.string().url(),
  timestamp: z.string(),
  nodeRunId: z.string(),
})

type ExtractFrameInput = z.infer<typeof ExtractFrameSchema>

export const extractFrameTask = task({
  id: 'extract-frame-ffmpeg',
  run: async (payload: ExtractFrameInput) => {
    const { videoUrl, timestamp, nodeRunId } = payload

    await logger.info('Starting frame extraction', { nodeRunId })

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextflow-'))
    const inputPath = path.join(tmpDir, 'input.mp4')
    const outputPath = path.join(tmpDir, 'frame.jpg')

    try {
      const vidRes = await fetch(videoUrl)
      fs.writeFileSync(inputPath, Buffer.from(await vidRes.arrayBuffer()))

      let resolvedTimestamp = timestamp
      if (timestamp.endsWith('%')) {
        const pct = parseFloat(timestamp) / 100
        const durationOutput = execSync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`,
        )
          .toString()
          .trim()
        const duration = parseFloat(durationOutput)
        resolvedTimestamp = String(Math.floor(pct * duration))
      }

      execSync(
        `ffmpeg -ss ${resolvedTimestamp} -i "${inputPath}" -vframes 1 -q:v 2 -y "${outputPath}"`,
      )

      const resultBuffer = fs.readFileSync(outputPath)
      const base64 = resultBuffer.toString('base64')
      const resultUrl = `data:image/jpeg;base64,${base64}`

      await logger.info('Frame extraction complete', { nodeRunId, resolvedTimestamp })
      return { resultUrl, nodeRunId }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
})
