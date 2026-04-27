import { configure } from '@trigger.dev/sdk/v3'

// Configure Trigger.dev SDK v4 with API key
if (process.env.TRIGGER_SECRET_KEY) {
  configure({ secretKey: process.env.TRIGGER_SECRET_KEY })
} else if (process.env.TRIGGER_API_KEY) {
  configure({ secretKey: process.env.TRIGGER_API_KEY })
}
