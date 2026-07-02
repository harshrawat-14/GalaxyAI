import type { WorkflowGraph } from "@/domain/types";
import { createRacingCarGraph } from "@/lib/seed";

export interface SystemWorkflowTemplate {
  id: string;
  name: string;
  buildGraph: () => WorkflowGraph;
  /** Cover shown on the dashboard card and the template preview page.
   * Convention: store the real asset at public/templates/<id>.<ext> and
   * point this at it — see public/templates/README.md. */
  coverImageUrl: string;
}

/** System-workflow templates (docs/prompts/flow-homepage.md Task 2). Append more entries here later — no redesign needed. */
export const SYSTEM_WORKFLOWS: SystemWorkflowTemplate[] = [
  {
    id: "ai-racing-car-generator",
    name: "AI Racing Car Generator",
    buildGraph: createRacingCarGraph,
    coverImageUrl: "/templates/ai-racing-car-generator.svg",
  },
];

export function getSystemWorkflow(id: string): SystemWorkflowTemplate | undefined {
  return SYSTEM_WORKFLOWS.find((t) => t.id === id);
}
