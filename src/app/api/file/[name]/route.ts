import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = '/tmp/nextflow-uploads'

const MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '')
  const filePath = join(UPLOAD_DIR, safeName)

  try {
    const buffer = await readFile(filePath)
    const ext = safeName.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME[ext] ?? 'application/octet-stream'
    return new Response(buffer, { headers: { 'Content-Type': contentType } })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
