import { configure } from '@trigger.dev/sdk/v3'

// This deployment's secret is stored as TRIGGER_API_KEY rather than the SDK's
// default TRIGGER_SECRET_KEY var name — configure() bridges the two so the
// SDK picks it up without renaming the actual .env secret.
if (process.env.TRIGGER_SECRET_KEY) {
  configure({ secretKey: process.env.TRIGGER_SECRET_KEY })
} else if (process.env.TRIGGER_API_KEY) {
  configure({ secretKey: process.env.TRIGGER_API_KEY })
}
