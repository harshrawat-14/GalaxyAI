const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * The model returned a candidate with no text. Deterministic given the same
 * request (almost always a truncated response — see `thinkingBudgetFor` in
 * lib/gemini.ts), so it is deliberately NOT retryable: backing off and asking
 * again produces the same empty candidate.
 */
export class EmptyGeminiResponseError extends Error {
  constructor(finishReason?: string) {
    super(
      finishReason === "MAX_TOKENS"
        ? "Gemini returned no text: the response hit maxOutputTokens before any output was produced. Raise Max output tokens on this node."
        : `Gemini returned no text${finishReason ? ` (finish reason: ${finishReason})` : ""}.`,
    );
    this.name = "EmptyGeminiResponseError";
  }
}
const RETRYABLE_MESSAGE_PATTERNS = [/fetch failed/i, /ECONNRESET/, /ETIMEDOUT/, /ECONNREFUSED/, /network/i];

/**
 * Classifies a Gemini call failure as transient (worth retrying with backoff)
 * vs permanent (retrying can never succeed). The @google/generative-ai SDK
 * throws GoogleGenerativeAIFetchError with a numeric `status` for HTTP-level
 * failures, and a plain GoogleGenerativeAIError (no status) wrapping the
 * underlying fetch error for network failures — see node_modules/@google/
 * generative-ai/dist/index.js's handleResponseError/handleResponseNotOk.
 */
export function isRetryableGeminiError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof EmptyGeminiResponseError) return false;

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return RETRYABLE_STATUS_CODES.has(status);

  if (error.name === "AbortError") return true;
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message));
}
