import { task, logger } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { uploadBufferToTransloadit } from '@/lib/transloadit-upload'

const CropInputSchema = z.object({
  imageUrl: z.string().min(1),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(0).max(100),
  heightPercent: z.number().min(0).max(100),
  nodeRunId: z.string(),
})

type CropInput = z.infer<typeof CropInputSchema>

export const cropImageTask = task({
  id: 'crop-image-ffmpeg',
  run: async (payload: CropInput) => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent, nodeRunId } = payload

    await logger.info('Starting image crop', {
      nodeRunId, xPercent, yPercent, widthPercent, heightPercent,
    })

    if (xPercent + widthPercent > 100 || yPercent + heightPercent > 100) {
      throw new Error(
        `Crop window out of bounds: X%${xPercent}+W%${widthPercent}=${xPercent + widthPercent} ` +
        `or Y%${yPercent}+H%${heightPercent}=${yPercent + heightPercent} exceeds 100%. ` +
        `Reduce X%, Y%, or width/height so the crop fits inside the image.`,
      )
    }

    let imgBuf: Buffer
    if (imageUrl.startsWith('data:')) {
      imgBuf = Buffer.from(imageUrl.split(',')[1] ?? '', 'base64')
    } else {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(`Failed to fetch source image (${res.status})`)
      imgBuf = Buffer.from(await res.arrayBuffer())
    }

    const sharp = (await import('sharp')).default
    const img = sharp(imgBuf)
    const { width = 100, height = 100, format = 'jpeg' } = await img.metadata()

    const left = Math.max(0, Math.min(width  - 1, Math.round(width  * xPercent / 100)))
    const top  = Math.max(0, Math.min(height - 1, Math.round(height * yPercent / 100)))
    const cw   = Math.max(1, Math.min(width  - left, Math.round(width  * widthPercent  / 100)))
    const ch   = Math.max(1, Math.min(height - top,  Math.round(height * heightPercent / 100)))

    const ext = format === 'png' ? 'png' : 'jpg'
    const outName = `crop-${randomBytes(8).toString('hex')}.${ext}`
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

    const cropped = await img.extract({ left, top, width: cw, height: ch }).toBuffer()
    const resultUrl = await uploadBufferToTransloadit(cropped, outName, mimeType)

    await logger.info('Image crop complete', { nodeRunId })
    return { resultUrl, nodeRunId }
  },
})
