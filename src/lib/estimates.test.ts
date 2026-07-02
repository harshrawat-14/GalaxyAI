import { describe, expect, it } from "vitest";
import { getNodeSpec, type GeminiConfig } from "@/domain/nodes";
import {
  DAILY_TOKEN_QUOTA,
  estimateBalanceM,
  estimateGraphTokens,
  estimateNodeTokens,
  estimateRunCredits,
  formatM,
} from "./estimates";

function node(kind: "request-inputs" | "gemini" | "crop-image" | "response", config: unknown) {
  return { kind, config };
}

describe("estimateNodeTokens / estimateGraphTokens", () => {
  it("never returns below the floor, even for an all-empty graph", () => {
    expect(estimateGraphTokens({ nodes: [] })).toBeGreaterThanOrEqual(100);
    expect(estimateNodeTokens(node("response", getNodeSpec("response").defaultConfig()))).toBeGreaterThanOrEqual(100);
  });

  it("sums chars/4 across request-inputs text fields and gemini prompts, floored", () => {
    const big = node("request-inputs", {
      fields: [{ id: "f1", name: "text_field", type: "text_field", value: "a".repeat(4000) }],
    });
    expect(estimateGraphTokens({ nodes: [big] })).toBe(1000);
  });

  it("ignores image fields and crop-image/response configs", () => {
    const withImage = node("request-inputs", {
      fields: [{ id: "f1", name: "image_field", type: "image_field", value: "https://x/y.png" }],
    });
    expect(estimateGraphTokens({ nodes: [withImage] })).toBe(100); // floor only
  });

  it("estimateNodeTokens matches estimateGraphTokens for a single gemini node", () => {
    const gemini = node("gemini", {
      ...(getNodeSpec("gemini").defaultConfig() as GeminiConfig),
      prompt: "b".repeat(4000),
      systemPrompt: "",
    });
    expect(estimateNodeTokens(gemini)).toBe(estimateGraphTokens({ nodes: [gemini] }));
  });
});

describe("formatM", () => {
  it("uses 4 decimal places below 1e4 tokens", () => {
    expect(formatM(100)).toBe("~0.0001 M");
  });

  it("uses 2 decimal places at/above 1e4 tokens", () => {
    expect(formatM(22_500)).toBe("~0.02 M");
  });

  it("always carries the ~ prefix and M suffix, never blank", () => {
    expect(formatM(0)).toMatch(/^~.*M$/);
  });
});

describe("estimateBalanceM", () => {
  it("returns the full quota formatted when no usage yet today", () => {
    expect(estimateBalanceM(0)).toBe(formatM(DAILY_TOKEN_QUOTA));
  });

  it("subtracts usage from the quota", () => {
    expect(estimateBalanceM(DAILY_TOKEN_QUOTA / 2)).toBe(formatM(DAILY_TOKEN_QUOTA / 2));
  });

  it("never goes negative even if usage exceeds the quota", () => {
    expect(estimateBalanceM(DAILY_TOKEN_QUOTA * 10)).toBe(formatM(0));
  });
});

describe("estimateRunCredits", () => {
  it("never returns below the floor for a run with no executions", () => {
    expect(estimateRunCredits({ nodeExecutions: [] })).toBeGreaterThanOrEqual(100);
  });

  it("sums text length across node executions' inputs and output", () => {
    const run = {
      nodeExecutions: [
        {
          nodeId: "n1",
          nodeKind: "gemini" as const,
          status: "success" as const,
          inputs: { prompt: "x".repeat(2000) },
          output: { text: "y".repeat(2000) },
          errorMessage: null,
          durationMs: 100,
        },
      ],
    };
    expect(estimateRunCredits(run)).toBe(1000); // (2000+2000)/4
  });
});
