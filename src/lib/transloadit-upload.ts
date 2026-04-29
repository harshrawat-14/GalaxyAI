import * as crypto from 'crypto'

/**
 * Uploads a raw buffer to Transloadit and returns the CDN ssl_url.
 * Uses a minimal assembly with no steps so Transloadit stores the file
 * as-is and returns it in the `uploads` array.
 */
export async function uploadBufferToTransloadit(
  buf: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const key = process.env.TRANSLOADIT_KEY
  const secret = process.env.TRANSLOADIT_SECRET
  if (!key || !secret) throw new Error('Transloadit not configured')

  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const params = JSON.stringify({ auth: { key, expires } })

  const signature =
    'sha384:' +
    crypto
      .createHmac('sha384', secret)
      .update(Buffer.from(params, 'utf-8'))
      .digest('hex')

  // Build multipart form manually — no external FormData dep needed in Node 18+
  const boundary = `----TransloaditBoundary${Date.now().toString(16)}`
  const CRLF = '\r\n'

  const partParams =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="params"${CRLF}${CRLF}` +
    `${params}${CRLF}`

  const partSig =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="signature"${CRLF}${CRLF}` +
    `${signature}${CRLF}`

  const partFileHeader =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
    `Content-Type: ${mimeType}${CRLF}${CRLF}`

  const partFileFooter = `${CRLF}--${boundary}--${CRLF}`

  const body = Buffer.concat([
    Buffer.from(partParams + partSig + partFileHeader),
    buf,
    Buffer.from(partFileFooter),
  ])

  const res = await fetch('https://api2.transloadit.com/assemblies', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Transloadit assembly failed (${res.status}): ${text}`)
  }

  type TransloaditFile = { ssl_url?: string; url?: string }
  type AssemblyResponse = {
    error?: string
    message?: string
    results?: Record<string, TransloaditFile[]>
    uploads?: TransloaditFile[]
  }

  const json = (await res.json()) as AssemblyResponse
  if (json.error) throw new Error(`Transloadit error: ${json.message ?? json.error}`)

  const allFiles: TransloaditFile[] = [
    ...Object.values(json.results ?? {}).flat(),
    ...(json.uploads ?? []),
  ]
  const url = allFiles[0]?.ssl_url ?? allFiles[0]?.url
  if (!url) throw new Error('Transloadit returned no file URL')
  return url
}
