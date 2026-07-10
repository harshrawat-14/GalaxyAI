import { validateGraph } from "@/domain/dag";
import { DEFAULT_GEMINI_MODEL, getNodeSpec } from "@/domain/nodes";
import type { WorkflowGraph } from "@/domain/types";

export const SAMPLE_WORKFLOW_NAME = "Parallel Fan-Out Demo";

/**
 * The required demo workflow (README "The sample workflow"): proves the
 * promise-graph fan-out engine end to end. Crop #1, Crop #2, and Gemini #1
 * all start at T=0; Gemini #2 starts the instant Gemini #1 finishes, without
 * waiting on the (30s+) crops; Final Gemini waits only on its three direct
 * parents — {Crop #1, Crop #2, Gemini #2}.
 *
 * Layout (left -> right): Request-Inputs, then a vertical column of
 * {Gemini #1, Crop #1, Crop #2}, then Gemini #2, then Final Gemini, then
 * Response. Columns are spaced wide and rows tall so no nodes overlap and every
 * edge is legible at 100%.
 */
const COL_X = { inputs: 0, fanOut: 480, gemini2: 980, finalGemini: 1480, response: 1980 };
const ROW_Y = { top: 40, middle: 620, bottom: 1200 };
export function buildSampleGraph(): WorkflowGraph {
  const inputsId = crypto.randomUUID();
  const crop1Id = crypto.randomUUID();
  const crop2Id = crypto.randomUUID();
  const gemini1Id = crypto.randomUUID();
  const gemini2Id = crypto.randomUUID();
  const finalGeminiId = crypto.randomUUID();
  const responseId = crypto.randomUUID();

  const graph: WorkflowGraph = {
    nodes: [
      {
        id: inputsId,
        kind: "request-inputs",
        position: { x: COL_X.inputs, y: ROW_Y.middle },
        config: {
          fields: [
            { id: "image_field", name: "image_field", type: "image_field", value: null },
            {
              id: "text_field",
              name: "text_field",
              type: "text_field",
              value:
                "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
            },
          ],
        },
      },
      {
        id: crop1Id,
        kind: "crop-image",
        position: { x: COL_X.fanOut, y: ROW_Y.middle },
        config: { x: 20, y: 20, width: 60, height: 60 }, // tight crop
      },
      {
        id: crop2Id,
        kind: "crop-image",
        position: { x: COL_X.fanOut, y: ROW_Y.bottom },
        config: { x: 0, y: 0, width: 100, height: 50 }, // wide crop
      },
      {
        id: gemini1Id,
        kind: "gemini",
        position: { x: COL_X.fanOut, y: ROW_Y.top },
        config: {
          model: DEFAULT_GEMINI_MODEL,
          prompt: "",
          systemPrompt: "You are a marketing copywriter. Write a one-paragraph product description.",
          temperature: 1,
          maxOutputTokens: 2048,
          reasoning: true,
        },
      },
      {
        id: gemini2Id,
        kind: "gemini",
        position: { x: COL_X.gemini2, y: ROW_Y.top },
        config: {
          model: DEFAULT_GEMINI_MODEL,
          prompt: "",
          systemPrompt:
            "Condense the following product description into a tweet-length hook (under 240 characters).",
          temperature: 1,
          maxOutputTokens: 512,
          reasoning: true,
        },
      },
      {
        id: finalGeminiId,
        kind: "gemini",
        position: { x: COL_X.finalGemini, y: ROW_Y.middle },
        config: {
          model: DEFAULT_GEMINI_MODEL,
          prompt: "",
          systemPrompt:
            "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
          temperature: 1,
          maxOutputTokens: 1024,
          reasoning: true,
        },
      },
      {
        id: responseId,
        kind: "response",
        position: { x: COL_X.response, y: ROW_Y.middle },
        config: { result: null },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: inputsId, sourceHandle: "image_field", target: crop1Id, targetHandle: "input_image" },
      { id: crypto.randomUUID(), source: inputsId, sourceHandle: "image_field", target: crop2Id, targetHandle: "input_image" },
      { id: crypto.randomUUID(), source: inputsId, sourceHandle: "text_field", target: gemini1Id, targetHandle: "prompt" },
      { id: crypto.randomUUID(), source: gemini1Id, sourceHandle: "response", target: gemini2Id, targetHandle: "prompt" },
      { id: crypto.randomUUID(), source: gemini2Id, sourceHandle: "response", target: finalGeminiId, targetHandle: "prompt" },
      { id: crypto.randomUUID(), source: crop1Id, sourceHandle: "output_image", target: finalGeminiId, targetHandle: "image" },
      { id: crypto.randomUUID(), source: crop2Id, sourceHandle: "output_image", target: finalGeminiId, targetHandle: "image" },
      { id: crypto.randomUUID(), source: finalGeminiId, sourceHandle: "response", target: responseId, targetHandle: "result" },
      // Response returns both the final caption and the wide banner crop (Nodes table #7).
      { id: crypto.randomUUID(), source: crop2Id, sourceHandle: "output_image", target: responseId, targetHandle: "result" },
    ],
    stickyNotes: [],
  };

  // Parse each config back onto the node so the literals above are filled out
  // with every schema default (topP/topK/reasoning/settingsOpen/imageUrl, …).
  // Otherwise the saved template graph carries partial configs and the editor
  // reads `undefined` for the omitted params.
  for (const node of graph.nodes) {
    node.config = getNodeSpec(node.kind).configSchema.parse(node.config) as typeof node.config;
  }

  const validation = validateGraph(graph);
  if (!validation.ok) throw new Error(`Sample graph failed validateGraph: ${validation.reason}`);

  return graph;
}
