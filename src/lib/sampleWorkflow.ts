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
 */
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
        position: { x: 40, y: 300 },
        config: {
          fields: [
            { id: "image_field", name: "image_field", type: "image_field", value: null },
            {
              id: "text_field",
              name: "text_field",
              type: "text_field",
              value: "We just launched a hand-stitched, sustainably-sourced leather backpack.",
            },
          ],
        },
      },
      {
        id: crop1Id,
        kind: "crop-image",
        position: { x: 380, y: 100 },
        config: { x: 20, y: 20, width: 60, height: 60 }, // tight crop
      },
      {
        id: crop2Id,
        kind: "crop-image",
        position: { x: 380, y: 500 },
        config: { x: 0, y: 0, width: 100, height: 50 }, // wide crop
      },
      {
        id: gemini1Id,
        kind: "gemini",
        position: { x: 380, y: 300 },
        config: {
          model: DEFAULT_GEMINI_MODEL,
          prompt: "",
          systemPrompt:
            "You are a professional copywriter. Expand the input into a vivid, persuasive 2-3 sentence product description.",
          temperature: 1,
          maxOutputTokens: 2048,
        },
      },
      {
        id: gemini2Id,
        kind: "gemini",
        position: { x: 700, y: 300 },
        config: {
          model: DEFAULT_GEMINI_MODEL,
          prompt: "",
          systemPrompt:
            "You are a social media expert. Turn the product description into one punchy, attention-grabbing tweet hook, under 200 characters.",
          temperature: 1,
          maxOutputTokens: 512,
        },
      },
      {
        id: finalGeminiId,
        kind: "gemini",
        position: { x: 1020, y: 300 },
        config: {
          model: DEFAULT_GEMINI_MODEL,
          prompt: "",
          systemPrompt:
            "You are a creative director. Combine the tweet hook with the two provided image crops into one cohesive final marketing caption that references both visuals.",
          temperature: 1,
          maxOutputTokens: 1024,
        },
      },
      {
        id: responseId,
        kind: "response",
        position: { x: 1360, y: 300 },
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
    ],
    stickyNotes: [],
  };

  for (const node of graph.nodes) {
    getNodeSpec(node.kind).configSchema.parse(node.config);
  }

  const validation = validateGraph(graph);
  if (!validation.ok) throw new Error(`Sample graph failed validateGraph: ${validation.reason}`);

  return graph;
}
