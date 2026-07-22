import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { serverEnv } from "@/env";
import { EmptyGeminiResponseError } from "@/lib/geminiErrors";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) client = new GoogleGenerativeAI(serverEnv().GOOGLE_AI_API_KEY);
  return client;
}

/** Fetches a CDN asset and inlines it as base64 for Gemini's multimodal input. */
async function toInlineDataPart(url: string): Promise<Part> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch asset for Gemini input: ${url} (${res.status})`);
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  return { inlineData: { mimeType, data } };
}

export interface GeminiRequest {
  model: string;
  prompt: string;
  systemPrompt?: string | null;
  images?: string[];
  video?: string | null;
  audio?: string | null;
  file?: string | null;
  temperature: number;
  maxOutputTokens: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  seed?: number | null;
  jsonMode?: boolean;
  reasoning?: boolean;
}

// "Thinking" via generationConfig.thinkingConfig.thinkingBudget is the
// 2.5-series control — sending it to a 2.0 model errors, so it's only included
// when the model id matches. The installed @google/generative-ai SDK (0.21.0)
// predates this field in its own GenerationConfig type, but it passes
// generationConfig straight through to the REST call as a plain object (see
// node_modules/@google/generative-ai/dist/index.js), so a typed extension
// object reaches the real API untouched.
//
// Gemini 3.x is deliberately NOT matched here: its thinking is controlled by
// `thinkingLevel` (low/high), not the numeric `thinkingBudget`, and sending the
// wrong field risks a 400 — unverified here since no live call was made against
// the billed key. Gemini 3 therefore runs with its default thinking; the
// EmptyGeminiResponseError guard below still catches a token-starved empty
// response and fails loudly (telling the user to raise Max output tokens)
// rather than silently succeeding. If Gemini 3 ever returns empty in testing,
// that's the signal to add a `thinkingLevel: "low"` branch here.
const THINKING_CAPABLE_MODEL = /2\.5/;

/** gemini-2.5-pro has no "thinking off" mode — budget 0 is rejected outright. */
const ALWAYS_THINKING_MODEL = /2\.5-pro/;

/** Smallest budget these models accept; also the floor we reserve for output. */
const MIN_THINKING_BUDGET = 128;

/**
 * Thinking tokens are billed against `maxOutputTokens`, so leaving the budget
 * to the model lets it spend the *entire* allowance reasoning and return a
 * candidate with finishReason MAX_TOKENS and no text parts at all. Confirmed
 * against the live API with the sample workflow's own settings: 512-, 1024-
 * and 2048-token gemini-2.5-pro calls each burned every available token on
 * thoughts and came back with "" — which is exactly how "Gemini #2 and #3
 * produced no output" presented, since an empty string is not an error.
 *
 * Capping the budget at half the allowance (never below the 128-token floor
 * the API enforces) guarantees the remaining half is available for the answer.
 */
function thinkingBudgetFor(reasoning: boolean, model: string, maxOutputTokens: number): number {
  if (!reasoning) return ALWAYS_THINKING_MODEL.test(model) ? MIN_THINKING_BUDGET : 0;
  return Math.max(MIN_THINKING_BUDGET, Math.floor(maxOutputTokens / 2));
}

interface GeminiGenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  seed?: number;
  responseMimeType?: string;
  thinkingConfig?: { thinkingBudget: number };
}

/**
 * Builds and runs a single multimodal generateContent call. Vision inputs
 * (images/video/audio/file) are fetched and sent as inlineData parts
 * alongside the text prompt (LLD §5.2).
 */
export async function generateGeminiResponse(req: GeminiRequest): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: req.model,
    systemInstruction: req.systemPrompt || undefined,
  });

  const mediaUrls = [...(req.images ?? []), req.video, req.audio, req.file].filter(
    (url): url is string => Boolean(url),
  );
  const mediaParts = await Promise.all(mediaUrls.map(toInlineDataPart));

  const generationConfig: GeminiGenerationConfig = {
    temperature: req.temperature,
    maxOutputTokens: req.maxOutputTokens,
  };
  if (req.topP !== undefined) generationConfig.topP = req.topP;
  if (req.topK !== undefined) generationConfig.topK = req.topK;
  if (req.stopSequences?.length) generationConfig.stopSequences = req.stopSequences;
  if (req.seed != null) generationConfig.seed = req.seed;
  if (req.jsonMode) generationConfig.responseMimeType = "application/json";
  if (THINKING_CAPABLE_MODEL.test(req.model)) {
    generationConfig.thinkingConfig = {
      thinkingBudget: thinkingBudgetFor(req.reasoning ?? false, req.model, req.maxOutputTokens),
    };
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: req.prompt }, ...mediaParts] }],
    generationConfig,
  });

  // Read the candidate's parts directly rather than calling response.text():
  // a truncated or filtered candidate can carry no `content` at all, and we
  // want the finishReason in the error rather than a bare "" flowing
  // downstream as a successful-looking empty output.
  const candidate = result.response.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
    .join("");

  if (!text.trim()) throw new EmptyGeminiResponseError(candidate?.finishReason);
  return text;
}
