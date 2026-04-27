import { task, logger } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CropInputSchema = z.object({
  imageUrl: z.string().url(),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(1).max(100),
  heightPercent: z.number().min(1).max(100),
  nodeRunId: z.string(),
})

type CropInput = z.infer<typeof CropInputSchema>

export const cropImageTask = task({
  id: 'crop-image-ffmpeg',
  run: async (payload: CropInput) => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent, nodeRunId } = payload

    await logger.info('Starting image crop', { nodeRunId })

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextflow-'))
    const inputPath = path.join(tmpDir, 'input.jpg')
    const outputPath = path.join(tmpDir, 'output.jpg')

    try {
      const imgRes = await fetch(imageUrl)
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
      fs.writeFileSync(inputPath, imgBuffer)

      const probeOutput = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`,
      )
        .toString()
        .trim()
      const [widthStr, heightStr] = probeOutput.split(',')
      const imgWidth = parseInt(widthStr ?? '0', 10)
      const imgHeight = parseInt(heightStr ?? '0', 10)

      const x = Math.round((xPercent / 100) * imgWidth)
      const y = Math.round((yPercent / 100) * imgHeight)
      const w = Math.round((widthPercent / 100) * imgWidth)
      const h = Math.round((heightPercent / 100) * imgHeight)

      execSync(
        `ffmpeg -i "${inputPath}" -vf "crop=${w}:${h}:${x}:${y}" -y "${outputPath}"`,
      )

      const resultBuffer = fs.readFileSync(outputPath)
      const base64 = resultBuffer.toString('base64')
      const resultUrl = `data:image/jpeg;base64,${base64}`

      await logger.info('Image crop complete', { nodeRunId })
      return { resultUrl, nodeRunId }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
})
