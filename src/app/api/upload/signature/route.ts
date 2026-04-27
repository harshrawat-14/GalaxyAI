import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import * as crypto from 'crypto'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.TRANSLOADIT_KEY
  const secret = process.env.TRANSLOADIT_SECRET

  if (!key || !secret) {
    return NextResponse.json(
      { error: 'Transloadit not configured' },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'image'

  const templateId =
    type === 'video'
      ? process.env.TRANSLOADIT_TEMPLATE_ID_VIDEO
      : process.env.TRANSLOADIT_TEMPLATE_ID_IMAGE

  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const params = JSON.stringify({
    auth: { key, expires },
    ...(templateId ? { template_id: templateId } : {}),
  })

  const signature =
    'sha384:' +
    crypto
      .createHmac('sha384', secret)
      .update(Buffer.from(params, 'utf-8'))
      .digest('hex')

  return NextResponse.json({ params, signature })
}
