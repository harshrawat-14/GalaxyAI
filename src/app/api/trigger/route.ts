import { NextResponse } from 'next/server'

// Trigger.dev SDK v4 tasks run on Trigger.dev's worker infrastructure.
// This endpoint serves as a health check / metadata endpoint for the Trigger.dev dashboard.
// Task execution is initiated from API routes via llmTask.trigger({ ... }).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'nextflow',
    triggerSdkVersion: 'v4',
    tasks: ['llm-groq-task', 'crop-image-ffmpeg', 'extract-frame-ffmpeg'],
  })
}
