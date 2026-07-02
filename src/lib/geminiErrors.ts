const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
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

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return RETRYABLE_STATUS_CODES.has(status);

  if (error.name === "AbortError") return true;
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message));
}
