import type { GeminiConfig, RequestInputsConfig } from "@/domain/nodes";
import type { GraphNode, NodeExecutionRecord, WorkflowRun } from "@/domain/types";

/**
 * NextFlow has no real token/credit/billing system. Every Est / Bal / "Used
 * credits" / per-node cost surface must still always show a plausible value
 * — never blank, never "—", never "N/A" (docs/prompts/placeholder-estimates.md).
 * This is the one shared, deterministic estimator backing all of them, so the
 * numbers are consistent everywhere. The "~" prefix and "Est"/estimate labels
 * (plus the Bal pill's tooltip) make clear these are approximations, never a
 * real billed amount.
 */
const DIVISOR = 4; // ~chars per token heuristic
const FLOOR_TOKENS = 100; // never show ~0.00 M
const DAILY_TOKEN_QUOTA = 5_000_000; // placeholder daily "balance" budget

function textLength(value: unknown): number {
  return typeof value === "string" ? value.length : 0;
}

/** Sums all user-facing text on a single node's config. */
export function estimateNodeTokens(node: Pick<GraphNode, "kind" | "config">): number {
  let chars = 0;

  if (node.kind === "request-inputs") {
    const config = node.config as RequestInputsConfig;
    for (const field of config.fields) {
      if (field.type === "text_field") chars += textLength(field.value);
    }
  } else if (node.kind === "gemini") {
    const config = node.config as GeminiConfig;
    chars += config.prompt.length + config.systemPrompt.length;
  }

  return Math.max(FLOOR_TOKENS, Math.round(chars / DIVISOR));
}

/** Sums estimateNodeTokens across the graph's executable nodes. */
export function estimateGraphTokens(graph: { nodes: Pick<GraphNode, "kind" | "config">[] }): number {
  let chars = 0;

  for (const node of graph.nodes) {
    if (node.kind === "request-inputs") {
      const config = node.config as RequestInputsConfig;
      for (const field of config.fields) {
        if (field.type === "text_field") chars += textLength(field.value);
      }
    } else if (node.kind === "gemini") {
      const config = node.config as GeminiConfig;
      chars += config.prompt.length + config.systemPrompt.length;
    }
  }

  return Math.max(FLOOR_TOKENS, Math.round(chars / DIVISOR));
}

function executionTextLength(exec: NodeExecutionRecord): number {
  let chars = 0;
  for (const value of Object.values(exec.inputs ?? {})) {
    if (typeof value === "string") chars += value.length;
    else if (Array.isArray(value)) chars += value.filter((v) => typeof v === "string").reduce((s, v) => s + (v as string).length, 0);
  }
  const output = exec.output as { text?: string; result?: unknown } | null | undefined;
  if (output && typeof output === "object") {
    if (typeof output.text === "string") chars += output.text.length;
    if (typeof output.result === "string") chars += output.result.length;
  }
  return chars;
}

/**
 * Estimates "credits used" for a finished run, summed over its node
 * executions' actual input/output text. Falls back to 0 extra chars if a
 * run has no executions yet (still floors to FLOOR_TOKENS below) — callers
 * with a live graph snapshot may pass it for a richer pre-run estimate via
 * estimateGraphTokens instead.
 */
export function estimateRunCredits(run: Pick<WorkflowRun, "nodeExecutions">): number {
  let chars = 0;
  for (const exec of run.nodeExecutions ?? []) {
    chars += executionTextLength(exec);
  }
  return Math.max(FLOOR_TOKENS, Math.round(chars / DIVISOR));
}

/**
 * Formats a token count as Magica-style millions, never empty:
 *   >= 1e4 tokens -> "~0.01 M" .. "~1.72 M"  (2 dp)
 *   <  1e4 tokens -> "~0.0001 M"             (4 dp)
 */
export function formatM(tokens: number): string {
  const dp = tokens < 1e4 ? 4 : 2;
  return `~${(tokens / 1_000_000).toFixed(dp)} M`;
}

/** Balance proxy for the Bal pill: quota minus today's estimated usage (>= 0). */
export function estimateBalanceM(usedTokensToday = 0): string {
  return formatM(Math.max(0, DAILY_TOKEN_QUOTA - usedTokensToday));
}

export { FLOOR_TOKENS, DAILY_TOKEN_QUOTA };
