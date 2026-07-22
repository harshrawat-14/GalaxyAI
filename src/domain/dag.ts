import { getNodeSpec } from "./nodes";
import { isCompatible } from "./ports";
import type { GraphEdge, GraphNode, WorkflowGraph } from "./types";

/**
 * Pure, framework-free graph algorithms. No React, no Prisma, no Trigger.dev.
 * The canvas, API validation, and execution engine all depend on this module
 * and not the other way around (Dependency Inversion).
 */

export function directParents(graph: WorkflowGraph, nodeId: string): string[] {
  return unique(graph.edges.filter((e) => e.target === nodeId).map((e) => e.source));
}

export function directChildren(graph: WorkflowGraph, nodeId: string): string[] {
  return unique(graph.edges.filter((e) => e.source === nodeId).map((e) => e.target));
}

/** Edges feeding a specific input handle (handles vision's multiple inputs). */
export function incomingEdges(graph: WorkflowGraph, nodeId: string, handleId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.target === nodeId && e.targetHandle === handleId);
}

/**
 * Would adding this edge create a cycle? We check reachability from the proposed
 * target back to the source. DAG-only is a hard invariant — enforced here so the
 * canvas can reject the drag before it is ever persisted.
 */
export function wouldCreateCycle(graph: WorkflowGraph, source: string, target: string): boolean {
  if (source === target) return true;
  const stack = [target];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === source) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...directChildren(graph, cur));
  }
  return false;
}

export interface ConnectionAttempt {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Single authority for "is this connection legal?": same-node rejection, port
 * existence, type compatibility, single-connection inputs, and cycle prevention.
 */
export function validateConnection(graph: WorkflowGraph, c: ConnectionAttempt): ValidationResult {
  if (c.source === c.target) return { ok: false, reason: "Cannot connect a node to itself" };

  const sourceNode = graph.nodes.find((n) => n.id === c.source);
  const targetNode = graph.nodes.find((n) => n.id === c.target);
  if (!sourceNode || !targetNode) return { ok: false, reason: "Unknown node" };

  const out = getNodeSpec(sourceNode.kind)
    .outputs(sourceNode.config)
    .find((p) => p.id === c.sourceHandle);
  const inp = getNodeSpec(targetNode.kind)
    .inputs(targetNode.config)
    .find((p) => p.id === c.targetHandle);
  if (!out || !inp) return { ok: false, reason: "Unknown handle" };

  if (!isCompatible(out.type, inp.type)) {
    return { ok: false, reason: `Cannot connect ${out.type} → ${inp.type}` };
  }
  if (!inp.multiple && incomingEdges(graph, c.target, c.targetHandle).length > 0) {
    return { ok: false, reason: "Input already connected" };
  }
  if (wouldCreateCycle(graph, c.source, c.target)) {
    return { ok: false, reason: "Connection would create a cycle" };
  }
  return { ok: true };
}

/**
 * Kahn's algorithm over the subgraph induced by `nodeIds` (or the whole graph).
 * Throws on cycles so callers fail fast rather than executing a malformed DAG.
 */
export function topologicalOrder(graph: WorkflowGraph, nodeIds?: string[]): string[] {
  const scope = new Set(nodeIds ?? graph.nodes.map((n) => n.id));
  const indegree = new Map<string, number>();
  for (const id of scope) indegree.set(id, 0);

  const edges = graph.edges.filter((e) => scope.has(e.source) && scope.has(e.target));
  for (const e of edges) indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);

  const queue = [...scope].filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of edges.filter((e) => e.source === id)) {
      const d = (indegree.get(e.target) ?? 0) - 1;
      indegree.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  if (order.length !== scope.size) throw new Error("Graph contains a cycle");
  return order;
}

/**
 * Re-validates every edge in a whole persisted graph against the same rules
 * `validateConnection` enforces per-drag — the server's defense against a
 * client that bypasses the canvas (AGENT.md §3: never duplicate, never skip).
 */
export function validateGraph(graph: WorkflowGraph): ValidationResult {
  for (const edge of graph.edges) {
    const sourceNode = nodeById(graph, edge.source);
    const targetNode = nodeById(graph, edge.target);
    if (!sourceNode || !targetNode) {
      return { ok: false, reason: `Edge "${edge.id}" references an unknown node` };
    }

    const out = getNodeSpec(sourceNode.kind)
      .outputs(sourceNode.config)
      .find((p) => p.id === edge.sourceHandle);
    const inp = getNodeSpec(targetNode.kind)
      .inputs(targetNode.config)
      .find((p) => p.id === edge.targetHandle);
    if (!out || !inp) {
      return { ok: false, reason: `Edge "${edge.id}" references an unknown handle` };
    }
    if (!isCompatible(out.type, inp.type)) {
      return { ok: false, reason: `Edge "${edge.id}": cannot connect ${out.type} → ${inp.type}` };
    }
  }

  for (const node of graph.nodes) {
    for (const port of getNodeSpec(node.kind).inputs(node.config)) {
      if (port.multiple) continue;
      if (incomingEdges(graph, node.id, port.id).length > 1) {
        return { ok: false, reason: `Node "${node.id}" input "${port.id}" has more than one connection` };
      }
    }
  }

  try {
    topologicalOrder(graph);
  } catch {
    return { ok: false, reason: "Graph contains a cycle" };
  }

  return { ok: true };
}

// NOTE: there is deliberately no upstream-closure ("ancestorsOf") helper here.
// A single-node or multi-select run executes ONLY the nodes the user targeted —
// the run scope is never widened to pull in dependencies. Values for an
// out-of-scope parent come from its last successful output instead of a fresh
// execution; see the orchestrator's getCachedOrManualOutput.

/**
 * Left→right layered auto-layout. Each node's column is its longest path from a
 * root (a node with no parents), so every edge points strictly rightward; nodes
 * sharing a column are stacked and centered vertically around a common midline.
 * Pure positioning only — returns new coordinates keyed by node id, leaving the
 * caller to apply them. Sticky notes are not part of the DAG and aren't touched.
 */
export function autoLayout(
  graph: WorkflowGraph,
  opts?: { colGap?: number; rowGap?: number },
): Map<string, { x: number; y: number }> {
  const colGap = opts?.colGap ?? 520;
  const rowGap = opts?.rowGap ?? 360;

  const order = topologicalOrder(graph); // throws on a cycle; graph is a DAG invariant
  const depth = new Map<string, number>();
  for (const id of order) {
    const parents = directParents(graph, id);
    depth.set(id, parents.length ? Math.max(...parents.map((p) => depth.get(p) ?? 0)) + 1 : 0);
  }

  const columns = new Map<number, string[]>();
  for (const id of order) {
    const d = depth.get(id) ?? 0;
    const col = columns.get(d) ?? [];
    col.push(id);
    columns.set(d, col);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of columns) {
    ids.forEach((id, i) => {
      positions.set(id, { x: d * colGap, y: (i - (ids.length - 1) / 2) * rowGap });
    });
  }
  return positions;
}

export function nodeById(graph: WorkflowGraph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
