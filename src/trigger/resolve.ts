import { incomingEdges } from "@/domain/dag";
import { getNodeSpec } from "@/domain/nodes";
import type { GraphNode, WorkflowGraph } from "@/domain/types";

/**
 * Resolves an upstream output value for a (sourceNodeId, sourceHandle) pair.
 * The orchestrator decides what this means: an in-scope parent's live promise
 * result, or an out-of-scope parent's cached last-success output / manual value.
 */
export type GetUpstreamResult = (
  sourceNodeId: string,
  sourceHandle: string,
) => Promise<unknown> | unknown;

export class MissingUpstreamInputError extends Error {
  constructor(
    public readonly nodeId: string,
    public readonly portId: string,
  ) {
    super(`Node "${nodeId}": required input "${portId}" has no connection and no value`);
    this.name = "MissingUpstreamInputError";
  }
}

/**
 * Resolves a node's runtime inputs from its connected edges and config,
 * falling back to a manual config value when a port has no incoming edge.
 * Required ports satisfied by neither throw `MissingUpstreamInputError` so the
 * orchestrator can fail that node with a precise message (LLD §4, §11).
 */
export async function resolveInputs(
  node: GraphNode,
  graph: WorkflowGraph,
  getUpstreamResult: GetUpstreamResult,
): Promise<Record<string, unknown>> {
  const spec = getNodeSpec(node.kind);
  const ports = spec.inputs(node.config);
  const inputs: Record<string, unknown> = {};

  for (const port of ports) {
    const edges = incomingEdges(graph, node.id, port.id);

    if (edges.length > 0) {
      const values = await Promise.all(
        edges.map((e) => getUpstreamResult(e.source, e.sourceHandle)),
      );
      inputs[port.id] = port.multiple ? values : values[0];
      continue;
    }

    const manual = spec.manualValue?.(node.config, port.id);
    if (manual !== undefined && manual !== null) {
      inputs[port.id] = manual;
    } else if (port.required) {
      throw new MissingUpstreamInputError(node.id, port.id);
    } else {
      inputs[port.id] = port.multiple ? [] : null;
    }
  }

  return inputs;
}
