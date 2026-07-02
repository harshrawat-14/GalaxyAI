import { defineConfig } from '@trigger.dev/sdk/v3'
import { ffmpeg } from '@trigger.dev/build/extensions/core'
import { prismaExtension } from '@trigger.dev/build/extensions/prisma'

export default defineConfig({
  // Replace with your Trigger.dev project ref (proj_xxxxxxxxxxxxxxxx).
  // Find it in the Trigger.dev dashboard → Project Settings.
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_replace_me',

  runtime: 'node',
  logLevel: 'log',

  // Allow long FFmpeg / LLM jobs (seconds). Crop Image alone has a mandatory 30s+ wait.
  maxDuration: 300,

  retries: {
    enabledInDev: true,
  },

  dirs: ['./src/trigger'],

  // Crop Image runs FFmpeg via the CLI inside the task, so the build image
  // must include the ffmpeg/ffprobe binaries. Prisma's query-engine binary is
  // platform-specific (local dev generates darwin-arm64; the deploy image is
  // Debian) — this extension regenerates the client for the deploy target
  // during the remote build instead of shipping the wrong-platform one.
  build: {
    extensions: [ffmpeg(), prismaExtension({ mode: 'legacy', schema: 'prisma/schema.prisma' })],
  },
})
