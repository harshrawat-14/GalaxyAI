import { z } from "zod";
import { NODE_KINDS } from "./nodes";

/**
 * Validation at the persistence/API boundary. The canvas may hold transient
 * invalid state, but nothing crosses into the database or a run without passing
 * through these schemas first.
 */

export const graphNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(NODE_KINDS),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.unknown(),
  locked: z.boolean().default(false),
});

export const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  sourceHandle: z.string().min(1),
  target: z.string().min(1),
  targetHandle: z.string().min(1),
});

export const stickyNoteSchema = z.object({
  id: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().min(1), height: z.number().min(1) }),
  text: z.string().default(""),
  color: z.string().default("#FEF08A"),
  bold: z.boolean().default(false),
  fontSize: z.number().min(8).max(72).default(16),
  fontFamily: z.string().default("sans"),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  // Defaulted so graphs persisted before this feature still parse.
  stickyNotes: z.array(stickyNoteSchema).default([]),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(120).default("Untitled Workflow"),
});

export const renameWorkflowSchema = z.object({
  name: z.string().min(1).max(120),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: workflowGraphSchema.optional(),
  coverImageUrl: z.string().nullable().optional(),
  /**
   * Client's last-seen `graphVersion`, for optimistic-concurrency autosave.
   * Deliberately NOT `updatedAt` — that column is also bumped by run-status
   * transitions (idle <-> running) that have nothing to do with the graph,
   * which used to cause spurious 409s on the next autosave after any run.
   */
  expectedVersion: z.number().int().optional(),
});

export const runScopeSchema = z.enum(["full", "partial", "single"]);

export const runRequestSchema = z.object({
  scope: runScopeSchema,
  /** Target node ids for single/partial runs; ignored for full. */
  nodeIds: z.array(z.string().min(1)).default([]),
  /** Snapshot of the graph to execute (must already be saved client-side). */
  graph: workflowGraphSchema,
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type RunRequestInput = z.infer<typeof runRequestSchema>;
