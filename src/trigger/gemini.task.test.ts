import { AbortTaskRunError } from "@trigger.dev/sdk";
import { describe, expect, it } from "vitest";
import { EmptyGeminiResponseError } from "@/lib/geminiErrors";
import { runGeminiAttempt, type GeminiTaskPayload } from "./gemini.task";

const PAYLOAD: GeminiTaskPayload = {
  nodeExecutionId: "ne1",
  model: "gemini-2.5-flash-lite",
  systemPrompt: null,
  prompt: "hello",
  images: [],
  video: null,
  audio: null,
  file: null,
  temperature: 0.7,
  maxOutputTokens: 1024,
  topP: 0.95,
  topK: 40,
  stopSequences: [],
  seed: null,
  jsonMode: false,
  reasoning: false,
};

function httpError(status: number): Error {
  const error = new Error(`upstream ${status}`);
  (error as { status?: number }).status = status;
  return error;
}

/** Mimics Trigger.dev's task retry loop: re-invoke until success or AbortTaskRunError. */
async function withSimulatedRetries<T>(attempt: () => Promise<T>, maxAttempts: number): Promise<T> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof AbortTaskRunError || i === maxAttempts) throw error;
    }
  }
  throw new Error("unreachable");
}

describe("runGeminiAttempt", () => {
  it("rethrows a transient 503 as-is so Trigger.dev's retry policy can back off", async () => {
    await expect(runGeminiAttempt(PAYLOAD, async () => Promise.reject(httpError(503)))).rejects.not.toBeInstanceOf(
      AbortTaskRunError,
    );
  });

  it("wraps a permanent 400 in AbortTaskRunError (no retries)", async () => {
    await expect(runGeminiAttempt(PAYLOAD, async () => Promise.reject(httpError(400)))).rejects.toBeInstanceOf(
      AbortTaskRunError,
    );
  });

  it("ultimately returns text when transient 503s precede a success, across simulated retries", async () => {
    let calls = 0;
    const generate = async () => {
      calls += 1;
      if (calls <= 2) throw httpError(503);
      return "final answer";
    };

    const result = await withSimulatedRetries(() => runGeminiAttempt(PAYLOAD, generate), 5);
    expect(result).toEqual({ text: "final answer" });
    expect(calls).toBe(3);
  });

  it("aborts (no retries) when the model returns an empty response — retrying yields the same empty candidate", async () => {
    let calls = 0;
    const generate = async () => {
      calls += 1;
      throw new EmptyGeminiResponseError("MAX_TOKENS");
    };

    await expect(withSimulatedRetries(() => runGeminiAttempt(PAYLOAD, generate), 5)).rejects.toBeInstanceOf(
      AbortTaskRunError,
    );
    expect(calls).toBe(1);
  });

  it("surfaces the empty-response cause instead of recording a silent empty success", async () => {
    await expect(
      runGeminiAttempt(PAYLOAD, async () => Promise.reject(new EmptyGeminiResponseError("MAX_TOKENS"))),
    ).rejects.toThrow(/maxOutputTokens/);
  });

  it("fails immediately on a permanent error, with zero retries attempted", async () => {
    let calls = 0;
    const generate = async () => {
      calls += 1;
      throw httpError(400);
    };

    await expect(withSimulatedRetries(() => runGeminiAttempt(PAYLOAD, generate), 5)).rejects.toBeInstanceOf(
      AbortTaskRunError,
    );
    expect(calls).toBe(1);
  });
});
