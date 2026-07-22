import { defineConfig } from '@trigger.dev/sdk/v3'
import { ffmpeg, syncEnvVars } from '@trigger.dev/build/extensions/core'
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
    extensions: [
      ffmpeg(),
      prismaExtension({ mode: 'legacy', schema: 'prisma/schema.prisma' }),
      // The Gemini call runs inside a Trigger.dev task, so the key must live in
      // the Trigger.dev environment (not just Vercel). The CLI has no `env set`,
      // so we push GEMINI_API_KEY from the deploy shell at deploy time. Only
      // pushed when present, so a deploy without it in-env leaves the value
      // untouched rather than clearing it.
      syncEnvVars(() =>
        process.env.GEMINI_API_KEY ? [{ name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY }] : [],
      ),
    ],
  },
})
