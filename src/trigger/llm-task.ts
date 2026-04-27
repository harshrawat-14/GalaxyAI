import { task, logger } from '@trigger.dev/sdk/v3'
import Groq from 'groq-sdk'
import { z } from 'zod'

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

    await logger.info('Starting Groq LLM call', { model, nodeRunId })

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }

    const userContent: ContentPart[] = []

    for (const imageUrl of imageUrls) {
      try {
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = response.headers.get('content-type') ?? 'image/jpeg'
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` },
        })
      } catch (err) {
        await logger.warn(`Failed to fetch image: ${imageUrl}`, { err: String(err) })
      }
    }

    userContent.push({ type: 'text', text: userMessage })

    type Message =
      | { role: 'system'; content: string }
      | { role: 'user'; content: ContentPart[] | string }

    const messages: Message[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: imageUrls.length > 0 ? userContent : userMessage })

    const completion = await client.chat.completions.create({
      model,
      messages: messages as Parameters<typeof client.chat.completions.create>[0]['messages'],
    })

    const text = completion.choices[0]?.message?.content ?? ''

    await logger.info('Groq LLM call completed', { nodeRunId, length: text.length })

    return { text, nodeRunId }
  },
})
