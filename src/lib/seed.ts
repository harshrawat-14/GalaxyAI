import { getNodeSpec, type GeminiConfig } from "@/domain/nodes";
import type { WorkflowGraph } from "@/domain/types";

/** Every new workflow starts with its two non-deletable nodes pre-placed (LLD §7 `POST /workflows`). */
export function createSeedGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: crypto.randomUUID(),
        kind: "request-inputs",
        position: { x: 80, y: 200 },
        config: getNodeSpec("request-inputs").defaultConfig(),
      },
      {
        id: crypto.randomUUID(),
        kind: "response",
        position: { x: 640, y: 200 },
        config: getNodeSpec("response").defaultConfig(),
      },
    ],
    edges: [],
    stickyNotes: [],
  };
}

/**
 * Backs the "AI Racing Car Generator" System Workflow card on the dashboard
 * (docs/prompts/flow-homepage.md). There's no template/shared-workflow
 * concept in the backend, so "opening" a system workflow just creates a new
 * user workflow seeded with this graph instead of the blank one above —
 * same create flow, different starting point.
 */
export function createRacingCarGraph(): WorkflowGraph {
  const inputsId = crypto.randomUUID();
  const geminiId = crypto.randomUUID();
  const responseId = crypto.randomUUID();

  const geminiConfig = getNodeSpec("gemini").defaultConfig() as GeminiConfig;
  geminiConfig.prompt = "A photorealistic blue sports car drifting on a winding mountain road at sunset.";

  return {
    nodes: [
      { id: inputsId, kind: "request-inputs", position: { x: 80, y: 220 }, config: getNodeSpec("request-inputs").defaultConfig() },
      { id: geminiId, kind: "gemini", position: { x: 420, y: 160 }, config: geminiConfig },
      { id: responseId, kind: "response", position: { x: 900, y: 220 }, config: getNodeSpec("response").defaultConfig() },
    ],
    edges: [
      { id: crypto.randomUUID(), source: geminiId, sourceHandle: "response", target: responseId, targetHandle: "result" },
    ],
    stickyNotes: [],
  };
}
