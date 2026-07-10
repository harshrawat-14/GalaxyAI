import { z } from "zod";
import type { PortDef } from "./ports";

/**
 * The four node kinds in NextFlow. Adding a fifth node type means adding one
 * entry to NODE_SPECS below — the DAG engine, type-checker, API, and canvas all
 * read from this registry and require no changes. (Open/Closed Principle.)
 */
export const NODE_KINDS = ["request-inputs", "crop-image", "gemini", "response"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export type NodeCategory = "input" | "image" | "llm" | "output";

/**
 * Declarative description of a node type. Ports may be static or derived from
 * the node's own config (Request-Inputs grows handles as the user adds fields),
 * so inputs/outputs are functions of config rather than fixed arrays.
 */
export interface NodeSpec<Config = unknown> {
  kind: NodeKind;
  label: string;
  category: NodeCategory;
  /** Plain-language purpose + a one-line input/output summary, shown in the node header's info popover. */
  description: string;
  /** Pre-placed Request-Inputs / Response cannot be removed by the user. */
  deletable: boolean;
  /** Whether this node runs as a Trigger.dev task (vs. local value resolution). */
  executable: boolean;
  /** Zod schema validating this node's config payload. */
  configSchema: z.ZodType<Config>;
  /** Factory for a fresh node's default config. */
  defaultConfig: () => Config;
  /** Input handles given the current config. */
  inputs: (config: Config) => PortDef[];
  /** Output handles given the current config. */
  outputs: (config: Config) => PortDef[];
  /**
   * Manual fallback value for an input port with no incoming edge (e.g. Gemini's
   * `prompt` textarea). Returns `undefined` if the port has no manual entry —
   * those ports must be satisfied by a connection.
   */
  manualValue?: (config: Config, portId: string) => unknown;
}

/* ------------------------------------------------------------------ */
/* Request-Inputs                                                     */
/* ------------------------------------------------------------------ */

export const REQUEST_FIELD_TYPES = ["text_field", "number_field", "boolean_field", "image_field"] as const;
export type RequestFieldType = (typeof REQUEST_FIELD_TYPES)[number];

export const requestFieldSchema = z.object({
  /** Stable id — also the output handle id. */
  id: z.string().min(1),
  /** User-editable name, e.g. "text_field", "image_field_2". */
  name: z.string().min(1),
  type: z.enum(REQUEST_FIELD_TYPES),
  /**
   * Resolved value at run time, always stored as a string regardless of
   * type: text content, an uploaded asset URL, a number's string form, or
   * "true"/"false" for booleans — keeps the schema/persistence shape
   * unchanged across all four field types; widgets parse/serialize.
   */
  value: z.string().nullable().default(null),
});
export type RequestField = z.infer<typeof requestFieldSchema>;

export const requestInputsConfigSchema = z.object({
  fields: z.array(requestFieldSchema).default([]),
});
export type RequestInputsConfig = z.infer<typeof requestInputsConfigSchema>;

/* ------------------------------------------------------------------ */
/* Crop Image                                                         */
/* ------------------------------------------------------------------ */

const pct = z.number().min(0).max(100);
export const cropImageConfigSchema = z.object({
  /** Manual fallback for input_image when it has no incoming edge — same pattern as Gemini's prompt/systemPrompt. */
  imageUrl: z.string().nullable().default(null),
  x: pct.default(0),
  y: pct.default(0),
  width: pct.default(100),
  height: pct.default(100),
});
export type CropImageConfig = z.infer<typeof cropImageConfigSchema>;

/* ------------------------------------------------------------------ */
/* Gemini 3.1 Pro                                                     */
/* ------------------------------------------------------------------ */

/**
 * Single source of truth for the default model id — swap this one line to
 * change models everywhere (defaultConfig, Zod default, the sample workflow).
 * Plain "gemini-3.1-pro" (no "-preview" suffix) isn't a real model id — the
 * actual API only exposes "gemini-3.1-pro-preview". Using "gemini-2.5-pro"
 * instead, confirmed working on the current (paid) key; see lib/constants.ts
 * re-export and the GEMINI_MODELS picker list.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";

// Gemini-valid generationConfig params only (docs/prompts/model-and-crop-nodes.md §3.2/§3.4)
// — frequencyPenalty/presencePenalty/repetitionPenalty/minP/topA are OpenAI-only and
// deliberately omitted; generateContent() rejects them.
export const geminiConfigSchema = z.object({
  model: z.string().default(DEFAULT_GEMINI_MODEL),
  prompt: z.string().default(""),
  systemPrompt: z.string().default(""),
  temperature: z.number().min(0).max(2).default(1),
  maxOutputTokens: z.number().int().positive().default(2048),
  topP: z.number().min(0).max(1).default(0.95),
  topK: z.number().int().min(1).max(100).default(40),
  /** Raw textarea value (e.g. "END, STOP, ###") — the task splits this to string[] for generationConfig. */
  stopSequences: z.string().default(""),
  seed: z.number().int().nullable().default(null),
  /** True -> generationConfig.responseMimeType = "application/json", else "text/plain". */
  jsonMode: z.boolean().default(false),
  /**
   * True -> generationConfig.thinkingConfig.thinkingBudget left to the model; false -> 0.
   * Defaults true because gemini-2.5-pro (the default model) has no "thinking off"
   * mode — sending thinkingBudget:0 makes the API reject the call with
   * "Budget 0 is invalid. This model only works in thinking mode."
   */
  reasoning: z.boolean().default(true),
  /** Collapsed-by-default Settings panel open/closed, persisted per node. */
  settingsOpen: z.boolean().default(false),
});
export type GeminiConfig = z.infer<typeof geminiConfigSchema>;

/* ------------------------------------------------------------------ */
/* Response                                                           */
/* ------------------------------------------------------------------ */

export const responseConfigSchema = z.object({
  result: z.string().nullable().default(null),
});
export type ResponseConfig = z.infer<typeof responseConfigSchema>;

/* ------------------------------------------------------------------ */
/* Registry                                                           */
/* ------------------------------------------------------------------ */

// Heterogeneous registry: each entry's Config differs, so the map type can't
// be expressed without `any` — getNodeSpec() below re-erases it to `NodeSpec`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NODE_SPECS: { [K in NodeKind]: NodeSpec<any> } = {
  "request-inputs": {
    kind: "request-inputs",
    label: "Request-Inputs",
    category: "input",
    description: "Defines the workflow's entry fields. Outputs: one text/image handle per field you add.",
    deletable: false,
    executable: false,
    configSchema: requestInputsConfigSchema,
    defaultConfig: () => ({ fields: [] }),
    inputs: () => [],
    outputs: (c: RequestInputsConfig) =>
      c.fields.map((f) => ({
        id: f.id,
        label: f.name,
        type: f.type === "image_field" ? "image" : "text",
      })),
  },

  "crop-image": {
    kind: "crop-image",
    label: "Crop Image",
    category: "image",
    description: "Crops an image to a rectangle. Input: an image. Output: the cropped image.",
    deletable: true,
    executable: true,
    configSchema: cropImageConfigSchema,
    defaultConfig: () => ({ imageUrl: null, x: 0, y: 0, width: 100, height: 100 }),
    inputs: () => [
      { id: "input_image", label: "Input Image", type: "image", required: true },
      // x/y/width/height are wireable from Request-Inputs for structural
      // parity (docs/prompts/model-and-crop-nodes.md follow-up), but the
      // node's own slider value always drives the actual crop — see
      // manualValue below and registry.ts's buildTaskPayload, which reads
      // config directly rather than these ports' resolved values.
      { id: "x", label: "X Position (%)", type: "text" },
      { id: "y", label: "Y Position (%)", type: "text" },
      { id: "width", label: "Width (%)", type: "text" },
      { id: "height", label: "Height (%)", type: "text" },
    ],
    outputs: () => [{ id: "output_image", label: "Output Image", type: "image" }],
    manualValue: (c: CropImageConfig, portId) => {
      if (portId === "input_image") return c.imageUrl || undefined;
      if (portId === "x" || portId === "y" || portId === "width" || portId === "height") return c[portId];
      return undefined;
    },
  },

  gemini: {
    kind: "gemini",
    label: "Gemini 3.1 Pro",
    category: "llm",
    description: "Calls Gemini with a prompt and optional media. Inputs: prompt, system prompt, image/video/audio/file. Output: the model's text response.",
    deletable: true,
    executable: true,
    configSchema: geminiConfigSchema,
    defaultConfig: () => ({
      model: DEFAULT_GEMINI_MODEL,
      prompt: "",
      systemPrompt: "",
      temperature: 1,
      maxOutputTokens: 2048,
      topP: 0.95,
      topK: 40,
      stopSequences: "",
      seed: null,
      jsonMode: false,
      reasoning: false,
      settingsOpen: false,
    }),
    inputs: () => [
      { id: "prompt", label: "Prompt", type: "text", required: true },
      { id: "system_prompt", label: "System Prompt", type: "text" },
      { id: "image", label: "Image (Vision)", type: "image", multiple: true },
      { id: "video", label: "Video", type: "video" },
      { id: "audio", label: "Audio", type: "audio" },
      { id: "file", label: "File", type: "file" },
      // Settings-panel params are wireable from Request-Inputs for structural
      // parity (docs/prompts/model-and-crop-nodes.md follow-up), same as
      // Crop's x/y/width/height — the node's own value always drives the
      // actual API call (registry.ts reads config directly, never these
      // ports' resolved values).
      { id: "temperature", label: "Temperature", type: "text" },
      { id: "max_output_tokens", label: "Max Output Tokens", type: "text" },
      { id: "top_p", label: "Top P", type: "text" },
      { id: "top_k", label: "Top K", type: "text" },
      { id: "stop_sequences", label: "Stop Sequences", type: "text" },
      { id: "seed", label: "Seed", type: "text" },
      { id: "json_mode", label: "JSON Mode", type: "text" },
      { id: "reasoning", label: "Reasoning", type: "text" },
    ],
    outputs: () => [{ id: "response", label: "Response", type: "text" }],
    manualValue: (c: GeminiConfig, portId) => {
      if (portId === "prompt") return c.prompt || undefined;
      if (portId === "system_prompt") return c.systemPrompt || undefined;
      if (portId === "temperature") return c.temperature;
      if (portId === "max_output_tokens") return c.maxOutputTokens;
      if (portId === "top_p") return c.topP;
      if (portId === "top_k") return c.topK;
      if (portId === "stop_sequences") return c.stopSequences;
      if (portId === "seed") return c.seed ?? undefined;
      if (portId === "json_mode") return c.jsonMode;
      if (portId === "reasoning") return c.reasoning;
      return undefined;
    },
  },

  response: {
    kind: "response",
    label: "Response",
    category: "output",
    description: "The workflow's final output. Input: the result to return when the run finishes.",
    deletable: false,
    executable: false,
    configSchema: responseConfigSchema,
    defaultConfig: () => ({ result: null }),
    inputs: () => [{ id: "result", label: "result", type: "any", required: true, multiple: true }],
    outputs: () => [],
  },
};

export function getNodeSpec(kind: NodeKind): NodeSpec {
  return NODE_SPECS[kind];
}

/** Display name for a node instance — Gemini shows its selected model (same as its own card header), other kinds show their static spec label. */
export function nodeDisplayLabel(kind: NodeKind, config: unknown): string {
  if (kind === "gemini") return (config as GeminiConfig).model;
  return getNodeSpec(kind).label;
}
