import { AbortTaskRunError, logger, task } from "@trigger.dev/sdk";
import { generateGeminiResponse } from "@/lib/gemini";
import { isRetryableGeminiError } from "@/lib/geminiErrors";
import { withNodeExecutionTracking } from "./taskRun";

export interface GeminiTaskPayload {
  nodeExecutionId: string;
  model: string;
  systemPrompt: string | null;
  prompt: string;
  images: string[];
  video: string | null;
  audio: string | null;
  file: string | null;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  /** Already split from the config's raw CSV textarea value — empty array omits the key. */
  stopSequences: string[];
  seed: number | null;
  jsonMode: boolean;
  reasoning: boolean;
}

export interface GeminiTaskOutput {
  text: string;
}

/**
 * One Gemini generation attempt with retryable/permanent classification.
 * Transient failures (429/5xx/network/timeout) are rethrown as-is so
 * Trigger.dev's task-level retry policy (below) backs off and retries;
 * permanent failures (bad request, auth, unknown model) are wrapped in
 * AbortTaskRunError so the task fails immediately with no retries.
 * Extracted from the task body so the classification can be unit-tested
 * without the Trigger.dev runtime.
 */
export async function runGeminiAttempt(
  payload: GeminiTaskPayload,
  generate: typeof generateGeminiResponse = generateGeminiResponse,
): Promise<GeminiTaskOutput> {
  const mediaCounts = {
    images: payload.images.length,
    video: payload.video ? 1 : 0,
    audio: payload.audio ? 1 : 0,
    file: payload.file ? 1 : 0,
  };
  logger.info("[gemini] calling Google AI Studio", {
    nodeExecutionId: payload.nodeExecutionId,
    model: payload.model,
    promptLength: payload.prompt.length,
    hasSystemPrompt: Boolean(payload.systemPrompt),
    media: mediaCounts,
  });

  try {
    const text = await generate(payload);
    logger.info("[gemini] response received", {
      nodeExecutionId: payload.nodeExecutionId,
      responseLength: text.length,
    });
    return { text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryable = isRetryableGeminiError(error);
    logger.error("[gemini] call failed", {
      nodeExecutionId: payload.nodeExecutionId,
      model: payload.model,
      retryable,
      message,
    });
    if (retryable) throw error; // rethrown as-is so Trigger.dev's retry policy backs off and retries
    throw new AbortTaskRunError(message);
  }
}

/** Runs a single Gemini multimodal generation (LLD §5.2). */
export const geminiExecute = task({
  id: "gemini.execute",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 30000, randomize: true },
  run: async (payload: GeminiTaskPayload): Promise<GeminiTaskOutput> => {
    logger.info("[gemini.execute] task started", { nodeExecutionId: payload.nodeExecutionId });
    const result = await withNodeExecutionTracking(
      payload.nodeExecutionId,
      () => runGeminiAttempt(payload),
      (output) => ({ text: output.text }),
    );
    logger.info("[gemini.execute] task finished", { nodeExecutionId: payload.nodeExecutionId });
    return result;
  },
});
