import { task, logger } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import { llmChat, detectProvider } from '@/lib/llm-client'

const LLMInputSchema = z.object({
  model: z.string(),
  systemPrompt: z.string().optional(),
  userMessage: z.string(),
  imageUrls: z.array(z.string()).optional(),
  nodeRunId: z.string(),
})

type LLMInput = z.infer<typeof LLMInputSchema>

export const llmTask = task({
  id: 'llm-groq-task',
  run: async (payload: LLMInput) => {
    const { model, systemPrompt, userMessage, imageUrls = [], nodeRunId } = payload
    const provider = detectProvider(model)

    await logger.info('Starting LLM call', { model, provider, nodeRunId })

    const { text, isImage } = await llmChat({ model, systemPrompt, userMessage, imageUrls })

    await logger.info('LLM call completed', { nodeRunId, provider, isImage, length: text.length })

    return { text, isImage: isImage ?? false, nodeRunId }
  },
})
