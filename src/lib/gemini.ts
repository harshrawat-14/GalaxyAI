import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { serverEnv } from "@/env";

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

// "Thinking" (generationConfig.thinkingConfig) is only documented for the
// 2.5-series models — sending it to a 2.0 model would error, so it's only
// ever included when the model id matches. The installed @google/generative-ai
// SDK (0.21.0) predates this field in its own GenerationConfig type, but it
// passes generationConfig straight through to the REST call as a plain
// object (see node_modules/@google/generative-ai/dist/index.js), so a typed
// extension object reaches the real API untouched.
const THINKING_CAPABLE_MODEL = /2\.5/;

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
  if (!req.reasoning && THINKING_CAPABLE_MODEL.test(req.model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: req.prompt }, ...mediaParts] }],
    generationConfig,
  });

  return result.response.text();
}
