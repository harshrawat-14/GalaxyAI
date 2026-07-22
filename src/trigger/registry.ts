import { resolveGeminiModel } from "@/domain/nodes";
import type { CropImageConfig, GeminiConfig, NodeKind, RequestInputsConfig } from "@/domain/nodes";
import type { GraphNode } from "@/domain/types";
import { cropExecute, type CropTaskOutput, type CropTaskPayload } from "./crop.task";
import { geminiExecute, type GeminiTaskOutput, type GeminiTaskPayload } from "./gemini.task";

/**
 * The only kind-aware code in the execution engine: which task runs a given
 * node kind, how to build its payload from resolved inputs + config, and how
 * to read its output value back out. Adding a fifth executable node kind
 * means adding one entry here — the orchestrator itself stays generic.
 */
export const TASK_BY_KIND = {
  "crop-image": cropExecute,
  gemini: geminiExecute,
} as const;

export type ExecutableNodeKind = keyof typeof TASK_BY_KIND;

export function isExecutableKind(kind: NodeKind): kind is ExecutableNodeKind {
  return kind in TASK_BY_KIND;
}

export function buildTaskPayload(
  node: GraphNode,
  inputs: Record<string, unknown>,
  nodeExecutionId: string,
): CropTaskPayload | GeminiTaskPayload {
  switch (node.kind) {
    case "crop-image": {
      const config = node.config as CropImageConfig;
      return {
        nodeExecutionId,
        imageUrl: inputs.input_image as string,
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
      };
    }
    case "gemini": {
      const config = node.config as GeminiConfig;
      return {
        nodeExecutionId,
        // Normalize a since-retired/unknown id to the default so it never 404s.
        model: resolveGeminiModel(config.model),
        systemPrompt: (inputs.system_prompt as string | null) ?? null,
        prompt: inputs.prompt as string,
        images: (inputs.image as string[] | null) ?? [],
        video: (inputs.video as string | null) ?? null,
        audio: (inputs.audio as string | null) ?? null,
        file: (inputs.file as string | null) ?? null,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        topP: config.topP,
        topK: config.topK,
        // Raw CSV textarea value -> string[]; split here (not in lib/gemini.ts)
        // so GeminiTaskPayload's shape matches what generationConfig actually needs.
        stopSequences: config.stopSequences
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        seed: config.seed,
        jsonMode: config.jsonMode,
        reasoning: config.reasoning,
      };
    }
    default:
      throw new Error(`Node kind "${node.kind}" is not executable`);
  }
}

export function extractOutputValue(kind: ExecutableNodeKind, output: unknown): unknown {
  switch (kind) {
    case "crop-image":
      return (output as CropTaskOutput).url;
    case "gemini":
      return (output as GeminiTaskOutput).text;
  }
}

/** Local (non-Trigger) output resolution for Request-Inputs / Response (LLD §6). */
export function resolveLocalOutputs(node: GraphNode): Record<string, unknown> {
  switch (node.kind) {
    case "request-inputs": {
      const config = node.config as RequestInputsConfig;
      return Object.fromEntries(config.fields.map((f) => [f.id, f.value]));
    }
    case "response":
      return {}; // terminal sink: no outputs; its captured value is `inputs.result`
    default:
      throw new Error(`Node kind "${node.kind}" is not local-resolvable`);
  }
}

/** What gets persisted to NodeExecution.output for a locally-resolved node. */
export function localExecutionOutput(
  node: GraphNode,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
): Record<string, unknown> {
  return node.kind === "response" ? { result: inputs.result } : outputs;
}
