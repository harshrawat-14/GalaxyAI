import type { NodeKind } from "./nodes";

/** A node as stored in the persisted graph. Config is validated per-kind. */
export interface GraphNode {
  id: string;
  kind: NodeKind;
  position: { x: number; y: number };
  config: unknown;
  /** UI-only: disables dragging (docs/prompts/node-controls.md). Never read by the DAG/run engine. */
  locked?: boolean;
}

/** A directed edge from one node's output handle to another's input handle. */
export interface GraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

/**
 * A purely decorative canvas annotation — never a DAG node. Kept in its own
 * top-level collection (not `nodes`) so the domain/execution layer never has
 * to know it exists: no kind, no ports, no config, no NodeSpec entry, never
 * topologically ordered, never run.
 */
export interface StickyNote {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  text: string;
  color: string;
  bold: boolean;
  fontSize: number;
  fontFamily: string;
}

export interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stickyNotes: StickyNote[];
}

export type WorkflowStatus = "idle" | "running";
export type RunScope = "full" | "partial" | "single";
export type RunStatus = "running" | "success" | "failed" | "partial";
export type NodeStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  graph: WorkflowGraph;
  coverImageUrl: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NodeExecutionRecord {
  nodeId: string;
  nodeKind: NodeKind;
  status: NodeStatus;
  inputs: Record<string, unknown>;
  output: unknown;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;
  scope: RunScope;
  status: RunStatus;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  nodeExecutions: NodeExecutionRecord[];
}
