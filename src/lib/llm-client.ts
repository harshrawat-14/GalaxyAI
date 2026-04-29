import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type LLMProvider = 'groq' | 'gemini' | 'huggingface'

/** True only when DEVELOPMENT=true is set in the server environment */
export const IS_DEVELOPMENT = process.env.DEVELOPMENT === 'true'

/** Detect provider purely from model name — no env var needed */
export function detectProvider(model: string): LLMProvider {
  if (model.startsWith('black-forest-labs/') || model.startsWith('stabilityai/')) {
    return 'huggingface'
  }
  if (model.startsWith('gemini-')) return 'gemini'
  return 'groq'
}

/**
 * In production only Gemini is supported.
 * In development (DEVELOPMENT=true) Groq and HuggingFace are also allowed.
 */
export function assertProviderAllowed(provider: LLMProvider): void {
  if (!IS_DEVELOPMENT && provider !== 'gemini') {
    throw new Error(
      `LLM provider "${provider}" is only available in development. ` +
      `Set DEVELOPMENT=true in your .env.local to enable it.`,
    )
  }
}

interface ChatInput {
  model: string
  systemPrompt?: string
  userMessage: string
  imageUrls?: string[]
}

interface ChatResult {
  text: string
  /** True when text is a data: URL containing a generated image */
  isImage?: boolean
}

export async function llmChat(input: ChatInput): Promise<ChatResult> {
  const provider = detectProvider(input.model)
  assertProviderAllowed(provider)
  if (provider === 'gemini') return geminiChat(input)
  if (provider === 'huggingface') return huggingFaceImageGen(input)
  return groqChat(input)
}

// ── Groq ─────────────────────────────────────────────────────────────────────

async function groqChat({ model, systemPrompt, userMessage, imageUrls = [] }: ChatInput): Promise<ChatResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const groq = new Groq({ apiKey })

  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

  const userContent: ContentPart[] = []

  for (const imageUrl of imageUrls) {
    if (!imageUrl) continue
    try {
      const res = await fetch(imageUrl)
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
      userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } })
    } catch {
      // skip failed image fetches
    }
  }

  userContent.push({ type: 'text', text: userMessage })

  type Message =
    | { role: 'system'; content: string }
    | { role: 'user'; content: ContentPart[] | string }

  const messages: Message[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: imageUrls.length > 0 ? userContent : userMessage })

  const completion = await groq.chat.completions.create({
    model,
    messages: messages as Parameters<typeof groq.chat.completions.create>[0]['messages'],
  })

  return { text: completion.choices[0]?.message?.content ?? '' }
}

// ── Gemini ────────────────────────────────────────────────────────────────────

const GEMINI_IMAGE_MODELS = new Set([
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
])

async function geminiChat({ model, systemPrompt, userMessage, imageUrls = [] }: ChatInput): Promise<ChatResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)

  // ── Gemini image generation (responseModalities) ─────────────
  if (GEMINI_IMAGE_MODELS.has(model)) {
    const imgModel = genAI.getGenerativeModel({ model })
    const result = await imgModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    })
    for (const part of result.response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const { data, mimeType } = part.inlineData
        return { text: `data:${mimeType};base64,${data}`, isImage: true }
      }
    }
    throw new Error('Gemini image generation returned no image data')
  }

  // ── Text / vision ─────────────────────────────────────────────
  const textModel = genAI.getGenerativeModel({
    model,
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
  })

  type GeminiPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }

  const parts: GeminiPart[] = []

  for (const imageUrl of imageUrls) {
    if (!imageUrl) continue
    try {
      const res = await fetch(imageUrl)
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
      parts.push({ inlineData: { mimeType, data: base64 } })
    } catch {
      // skip failed image fetches
    }
  }

  parts.push({ text: userMessage })

  const result = await textModel.generateContent({
    contents: [{ role: 'user', parts }],
  })

  return { text: result.response.text() }
}

// ── HuggingFace ───────────────────────────────────────────────────────────────
// HF moved to router.huggingface.co/hf-inference in 2025; old api-inference endpoint returns 404

async function huggingFaceImageGen({ model, userMessage }: ChatInput): Promise<ChatResult> {
  const token = process.env.HF_TOKEN
  if (!token) throw new Error('HF_TOKEN not configured')

  const body: Record<string, unknown> = { inputs: userMessage }
  if (model === 'black-forest-labs/FLUX.1-schnell') {
    body.parameters = { num_inference_steps: 4 }
  }

  const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HuggingFace API error ${res.status}: ${err}`)
  }

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg'

  return { text: `data:${mimeType};base64,${base64}`, isImage: true }
}
