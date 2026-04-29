import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

const UPLOAD_DIR = '/tmp/nextflow-uploads'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  await mkdir(UPLOAD_DIR, { recursive: true })

  const ext = file.name.split('.').pop() ?? 'bin'
  const name = `${randomBytes(8).toString('hex')}.${ext}`
  const filePath = join(UPLOAD_DIR, name)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  return NextResponse.json({ url: `/api/file/${name}` })
}
