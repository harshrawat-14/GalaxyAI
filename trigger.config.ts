import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  // Replace with your Trigger.dev project ref (proj_xxxxxxxxxxxxxxxx).
  // Find it in the Trigger.dev dashboard → Project Settings.
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_replace_me',

  runtime: 'node',
  logLevel: 'log',

  // Allow long FFmpeg / LLM jobs (seconds).
  maxDuration: 300,

  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },

  dirs: ['./src/trigger'],

  build: {
    external: ['ffmpeg-static'],
  },
})
