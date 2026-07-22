import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import { autoLayout, validateConnection, type ConnectionAttempt, type ValidationResult } from "@/domain/dag";
import { getNodeSpec, type NodeKind, type RequestField, type RequestInputsConfig } from "@/domain/nodes";
import type { GraphEdge, GraphNode, NodeStatus, StickyNote, WorkflowGraph } from "@/domain/types";

export interface NextFlowNodeData extends Record<string, unknown> {
  kind: NodeKind;
  config: unknown;
  status: NodeStatus;
  output?: unknown;
  /** UI-only: disables dragging (docs/prompts/node-controls.md). Mirrors the node's top-level `draggable`. */
  locked?: boolean;
}

export type NextFlowNode = Node<NextFlowNodeData>;

/**
 * Purely decorative — never a DAG node (see domain/types.ts StickyNote doc
 * comment). Rendered via the same React Flow `nodes` array as real graph
 * nodes purely so it gets free drag/resize/pan/zoom — `isStickyNoteNode()`
 * below is the one place that distinguishes them, and the domain/execution
 * layer never sees this shape at all (toWorkflowGraph splits it into its own
 * top-level `stickyNotes` collection before anything touches persistence).
 */
export interface StickyNoteNodeData extends Record<string, unknown> {
  isStickyNote: true;
  text: string;
  color: string;
  bold: boolean;
  fontSize: number;
  fontFamily: string;
}

export type StickyNoteRFNode = Node<StickyNoteNodeData>;
export type AnyCanvasNode = NextFlowNode | StickyNoteRFNode;
export type NextFlowEdge = Edge;

export function isStickyNoteNode(node: AnyCanvasNode): node is StickyNoteRFNode {
  return (node.data as { isStickyNote?: boolean }).isStickyNote === true;
}

/** All custom edges render as the animated purple connector (LLD §9). */
export const EDGE_TYPE = "nextflow-edge";

export const STICKY_NOTE_TYPE = "sticky-note";
const STICKY_NOTE_DEFAULT_SIZE = { width: 220, height: 160 };

interface Snapshot {
  nodes: AnyCanvasNode[];
  edges: NextFlowEdge[];
}

interface WorkflowStoreState {
  workflowId: string | null;
  nodes: AnyCanvasNode[];
  edges: NextFlowEdge[];
  selection: string[];
  dirty: boolean;
  /**
   * Last-seen Workflow.graphVersion — the optimistic-concurrency token for
   * autosave. Deliberately not `updatedAt`: that column is also bumped by
   * run-status transitions (idle <-> running) unrelated to the graph, which
   * used to cause a spurious 409 on the next autosave after any run.
   */
  savedAt: number | null;
  runId: string | null;
  past: Snapshot[];
  future: Snapshot[];

  load: (workflowId: string, graph: WorkflowGraph, savedAt: number) => void;
  /** Replaces the graph from an imported JSON file — unlike `load`, this marks dirty so it autosaves. */
  importGraph: (graph: WorkflowGraph) => void;
  setNodes: (nodes: AnyCanvasNode[] | ((current: AnyCanvasNode[]) => AnyCanvasNode[])) => void;
  setEdges: (edges: NextFlowEdge[] | ((current: NextFlowEdge[]) => NextFlowEdge[])) => void;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  /** Re-lays out every graph node into a clean left→right layered layout (undoable, autosaved). */
  autoArrange: () => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (
    id: string,
    patch: Record<string, unknown> | ((config: Record<string, unknown>) => Record<string, unknown>),
  ) => void;
  addStickyNote: (position: { x: number; y: number }) => void;
  updateStickyNote: (id: string, patch: Partial<StickyNoteNodeData>) => void;
  resizeStickyNote: (id: string, size: { width: number; height: number }) => void;
  removeStickyNote: (id: string) => void;
  /** Clones a node only (deep-copied config, no edges), offset +48/+48, selected after. */
  duplicateNode: (id: string) => void;
  /** Clones a node AND recreates its incident edges, skipping any that would fail validateConnection. */
  duplicateNodeWithEdges: (id: string) => void;
  /** Toggles `locked` (disables dragging only — select/run/connect/delete all still work). */
  toggleNodeLocked: (id: string) => void;
  connect: (conn: ConnectionAttempt) => ValidationResult;
  disconnect: (edgeId: string) => void;
  /**
   * "+"-button shortcut on a Gemini/Crop param row (docs/prompts/model-and-crop-nodes.md,
   * superseded to be a real wired connection per follow-up direction): adds a new field
   * of `fieldType` to the (sole, pre-placed) Request-Inputs node and connects its output
   * straight into `targetNodeId`'s `targetHandle`, as one undoable step. No-op if there's
   * no Request-Inputs node or the connection would be invalid.
   */
  addRequestInputsFieldAndConnect: (targetNodeId: string, targetHandle: string, fieldType: RequestField["type"]) => void;
  /** Removes a Request-Inputs field AND any edges sourced from it, atomically — otherwise the dangling edge keeps every wired param's `connected` state stuck `true`. */
  removeRequestInputsField: (nodeId: string, fieldId: string) => void;
  /** Reorders a Request-Inputs node's fields to match `orderedFieldIds` (drag-to-reorder handle). One undo entry per drop. */
  reorderRequestInputsFields: (nodeId: string, orderedFieldIds: string[]) => void;
  setSelection: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  toGraph: () => WorkflowGraph;
  applyRealtime: (nodeId: string, status: NodeStatus, output?: unknown) => void;
  setRunId: (runId: string | null) => void;
  markSaved: (savedAt: number) => void;
  scheduleAutosave: (save: (graph: WorkflowGraph, expectedVersion: number | null) => void) => void;
  /** Collapsed state of the floating canvas toolbar — persisted in the store, not per-workflow. */
  toolbarCollapsed: boolean;
  toggleToolbarCollapsed: () => void;
  /** Collapsed state of the canvas page's left sidebar — survives navigation, not per-workflow. */
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}

function snapshotOf(state: Pick<WorkflowStoreState, "nodes" | "edges">): Snapshot {
  return { nodes: state.nodes, edges: state.edges };
}

export function graphNodeToRF(node: GraphNode): NextFlowNode {
  return {
    id: node.id,
    type: node.kind,
    position: node.position,
    deletable: getNodeSpec(node.kind).deletable,
    draggable: !node.locked,
    data: { kind: node.kind, config: node.config, status: "pending", locked: node.locked ?? false },
  };
}

export function graphEdgeToRF(edge: GraphEdge): NextFlowEdge {
  return {
    id: edge.id,
    type: EDGE_TYPE,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
  };
}

export function stickyNoteToRF(note: StickyNote): StickyNoteRFNode {
  return {
    id: note.id,
    type: STICKY_NOTE_TYPE,
    position: note.position,
    width: note.size.width,
    height: note.size.height,
    data: {
      isStickyNote: true,
      text: note.text,
      color: note.color,
      bold: note.bold,
      fontSize: note.fontSize,
      fontFamily: note.fontFamily,
    },
  };
}

function rfToStickyNote(n: StickyNoteRFNode): StickyNote {
  return {
    id: n.id,
    position: n.position,
    size: {
      width: n.width ?? STICKY_NOTE_DEFAULT_SIZE.width,
      height: n.height ?? STICKY_NOTE_DEFAULT_SIZE.height,
    },
    text: n.data.text,
    color: n.data.color,
    bold: n.data.bold,
    fontSize: n.data.fontSize,
    fontFamily: n.data.fontFamily,
  };
}

export function toWorkflowGraph(nodes: AnyCanvasNode[], edges: NextFlowEdge[]): WorkflowGraph {
  const realNodes = nodes.filter((n): n is NextFlowNode => !isStickyNoteNode(n));
  const stickyNotes = nodes.filter(isStickyNoteNode);
  return {
    nodes: realNodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      position: n.position,
      config: n.data.config,
      locked: n.data.locked ?? false,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? "",
      target: e.target,
      targetHandle: e.targetHandle ?? "",
    })),
    stickyNotes: stickyNotes.map(rfToStickyNote),
  };
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  workflowId: null,
  nodes: [],
  edges: [],
  selection: [],
  dirty: false,
  savedAt: null,
  runId: null,
  past: [],
  future: [],
  toolbarCollapsed: false,
  toggleToolbarCollapsed: () => set((state) => ({ toolbarCollapsed: !state.toolbarCollapsed })),
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  load: (workflowId, graph, savedAt) => {
    set({
      workflowId,
      nodes: [...graph.nodes.map(graphNodeToRF), ...graph.stickyNotes.map(stickyNoteToRF)],
      edges: graph.edges.map(graphEdgeToRF),
      selection: [],
      dirty: false,
      savedAt,
      runId: null,
      past: [],
      future: [],
    });
  },

  importGraph: (graph) => {
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: [...graph.nodes.map(graphNodeToRF), ...graph.stickyNotes.map(stickyNoteToRF)],
      edges: graph.edges.map(graphEdgeToRF),
      selection: [],
      dirty: true,
    }));
  },

  // Position/selection updates from React Flow's own drag/select handling —
  // not undoable structural edits. Must resolve against the *current* store
  // state (function form), not a value computed from a render's closure:
  // React Flow fires onNodesChange (e.g. a "select" change) on the same
  // click that triggers an unrelated config update inside the node (e.g.
  // clicking "+ Text"); if both happen before Canvas.tsx re-renders, a
  // closure-captured `nodes` here would stomp the config update with stale
  // data. Confirmed via Playwright: this was silently dropping the first of
  // two rapid clicks on Request-Inputs' field-add buttons.
  // Missing `dirty: true` here (unlike every other mutator in this store)
  // silently dropped all node drag/position changes from autosave — they'd
  // render fine until reload, then reset to whatever was last actually
  // persisted, since scheduleAutosave's effect bails out when `!dirty`.
  setNodes: (nodes) =>
    set((state) => ({ nodes: typeof nodes === "function" ? nodes(state.nodes) : nodes, dirty: true })),
  setEdges: (edges) => set((state) => ({ edges: typeof edges === "function" ? edges(state.edges) : edges })),

  addNode: (kind, position) => {
    const spec = getNodeSpec(kind);
    const node: NextFlowNode = {
      id: crypto.randomUUID(),
      type: kind,
      position,
      deletable: spec.deletable,
      data: { kind, config: spec.defaultConfig(), status: "pending" },
    };
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: [...state.nodes, node],
      dirty: true,
    }));
  },

  autoArrange: () => {
    set((state) => {
      const graph = toWorkflowGraph(state.nodes, state.edges);
      let layout: Map<string, { x: number; y: number }>;
      try {
        layout = autoLayout(graph);
      } catch {
        return state; // cycle (shouldn't happen — DAG invariant); leave positions untouched
      }
      return {
        past: [...state.past, snapshotOf(state)],
        future: [],
        // Sticky notes aren't part of the DAG, so they keep their positions.
        nodes: state.nodes.map((n) =>
          !isStickyNoteNode(n) && layout.has(n.id) ? { ...n, position: layout.get(n.id)! } : n,
        ),
        dirty: true,
      };
    });
  },

  removeNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node || isStickyNoteNode(node) || !getNodeSpec(node.data.kind).deletable) return;
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selection: state.selection.filter((s) => s !== id),
      dirty: true,
    }));
  },

  // Resolves `patch` against each node's *current* config inside the set()
  // callback, not whatever `config` the caller's render closed over — two
  // updates fired back-to-back (e.g. two quick clicks) before React
  // re-renders would otherwise both read the same stale config and the
  // second write would clobber the first (confirmed via Playwright firing
  // synchronous clicks faster than a render cycle).
  updateNodeConfig: (id, patch) => {
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: state.nodes.map((n) => {
        if (n.id !== id || isStickyNoteNode(n)) return n;
        const currentConfig = n.data.config as Record<string, unknown>;
        const nextConfig = typeof patch === "function" ? patch(currentConfig) : { ...currentConfig, ...patch };
        return { ...n, data: { ...n.data, config: nextConfig } };
      }),
      dirty: true,
    }));
  },

  addStickyNote: (position) => {
    const node: StickyNoteRFNode = {
      id: crypto.randomUUID(),
      type: STICKY_NOTE_TYPE,
      position,
      width: STICKY_NOTE_DEFAULT_SIZE.width,
      height: STICKY_NOTE_DEFAULT_SIZE.height,
      data: {
        isStickyNote: true,
        text: "",
        color: "#FEF08A",
        bold: false,
        fontSize: 16,
        fontFamily: "sans",
      },
    };
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: [...state.nodes, node],
      dirty: true,
    }));
  },

  // Style/text edits skip the undo stack — same rationale as updateNodeConfig
  // not being undoable per keystroke would be a poor UX, but unlike that
  // action this is purely cosmetic and never feeds a run either way.
  updateStickyNote: (id, patch) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id && isStickyNoteNode(n) ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
      dirty: true,
    }));
  },

  resizeStickyNote: (id, size) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id && isStickyNoteNode(n) ? { ...n, width: size.width, height: size.height } : n,
      ),
      dirty: true,
    }));
  },

  removeStickyNote: (id) => {
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: state.nodes.filter((n) => n.id !== id),
      selection: state.selection.filter((s) => s !== id),
      dirty: true,
    }));
  },

  duplicateNode: (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id);
    if (!node || isStickyNoteNode(node)) return;

    const spec = getNodeSpec(node.data.kind);
    const clone: NextFlowNode = {
      id: crypto.randomUUID(),
      type: node.type,
      position: { x: node.position.x + 48, y: node.position.y + 48 },
      deletable: spec.deletable,
      draggable: !node.data.locked,
      data: {
        kind: node.data.kind,
        config: structuredClone(node.data.config),
        status: "pending",
        locked: node.data.locked ?? false,
      },
    };
    set((s) => ({
      past: [...s.past, snapshotOf(s)],
      future: [],
      nodes: [...s.nodes, clone],
      selection: [clone.id],
      dirty: true,
    }));
  },

  // Single undoable op: clones the node, then re-creates each incident edge
  // on the clone — but only after re-checking it through the same
  // validateConnection() the canvas/API both use, silently skipping any
  // edge that would now be invalid (e.g. a single-input handle already
  // spoken for by an earlier duplicated edge). The graph must stay a valid
  // DAG; this never bypasses that check to force a clone-with-edges.
  duplicateNodeWithEdges: (id) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === id);
    if (!node || isStickyNoteNode(node)) return;

    const spec = getNodeSpec(node.data.kind);
    const clone: NextFlowNode = {
      id: crypto.randomUUID(),
      type: node.type,
      position: { x: node.position.x + 48, y: node.position.y + 48 },
      deletable: spec.deletable,
      draggable: !node.data.locked,
      data: {
        kind: node.data.kind,
        config: structuredClone(node.data.config),
        status: "pending",
        locked: node.data.locked ?? false,
      },
    };

    const incident = state.edges.filter((e) => e.source === id || e.target === id);
    const nextNodes = [...state.nodes, clone];
    const validEdges: NextFlowEdge[] = [];

    for (const edge of incident) {
      const candidate: ConnectionAttempt = {
        source: edge.source === id ? clone.id : edge.source,
        sourceHandle: edge.sourceHandle ?? "",
        target: edge.target === id ? clone.id : edge.target,
        targetHandle: edge.targetHandle ?? "",
      };
      const graph = toWorkflowGraph(nextNodes, [...state.edges, ...validEdges]);
      if (!validateConnection(graph, candidate).ok) continue;
      validEdges.push({ id: crypto.randomUUID(), type: EDGE_TYPE, ...candidate });
    }

    set((s) => ({
      past: [...s.past, snapshotOf(s)],
      future: [],
      nodes: nextNodes,
      edges: [...s.edges, ...validEdges],
      selection: [clone.id],
      dirty: true,
    }));
  },

  toggleNodeLocked: (id) => {
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      nodes: state.nodes.map((n) => {
        if (n.id !== id || isStickyNoteNode(n)) return n;
        const locked = !n.data.locked;
        return { ...n, draggable: !locked, data: { ...n.data, locked } };
      }),
      dirty: true,
    }));
  },

  /** Single authority for connection legality — same `validateConnection` the API re-checks (LLD §9). */
  connect: (conn) => {
    const graph = toWorkflowGraph(get().nodes, get().edges);
    const result = validateConnection(graph, conn);
    if (!result.ok) return result;

    const edge: NextFlowEdge = { id: crypto.randomUUID(), type: EDGE_TYPE, ...conn };
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      edges: [...state.edges, edge],
      dirty: true,
    }));
    return { ok: true };
  },

  addRequestInputsFieldAndConnect: (targetNodeId, targetHandle, fieldType) => {
    const state = get();
    const inputsNode = state.nodes.find((n) => !isStickyNoteNode(n) && n.data.kind === "request-inputs");
    if (!inputsNode || isStickyNoteNode(inputsNode)) return;

    const config = inputsNode.data.config as RequestInputsConfig;
    const count = config.fields.filter((f) => f.type === fieldType).length + 1;
    const field: RequestField = { id: crypto.randomUUID(), name: `${fieldType}_${count}`, type: fieldType, value: null };
    const nextNodes = state.nodes.map((n) => {
      if (n.id !== inputsNode.id || isStickyNoteNode(n)) return n;
      return { ...n, data: { ...n.data, config: { ...config, fields: [...config.fields, field] } } };
    });

    const candidate: ConnectionAttempt = {
      source: inputsNode.id,
      sourceHandle: field.id,
      target: targetNodeId,
      targetHandle,
    };
    const graph = toWorkflowGraph(nextNodes, state.edges);
    if (!validateConnection(graph, candidate).ok) return;
    const edge: NextFlowEdge = { id: crypto.randomUUID(), type: EDGE_TYPE, ...candidate };

    set((s) => ({
      past: [...s.past, snapshotOf(s)],
      future: [],
      nodes: nextNodes,
      edges: [...s.edges, edge],
      dirty: true,
    }));
  },

  removeRequestInputsField: (nodeId, fieldId) => {
    set((state) => {
      const nextNodes = state.nodes.map((n) => {
        if (n.id !== nodeId || isStickyNoteNode(n)) return n;
        const config = n.data.config as RequestInputsConfig;
        return { ...n, data: { ...n.data, config: { ...config, fields: config.fields.filter((f) => f.id !== fieldId) } } };
      });
      const nextEdges = state.edges.filter((e) => !(e.source === nodeId && e.sourceHandle === fieldId));
      return {
        past: [...state.past, snapshotOf(state)],
        future: [],
        nodes: nextNodes,
        edges: nextEdges,
        dirty: true,
      };
    });
  },

  reorderRequestInputsFields: (nodeId, orderedFieldIds) => {
    set((state) => {
      const nextNodes = state.nodes.map((n) => {
        if (n.id !== nodeId || isStickyNoteNode(n)) return n;
        const config = n.data.config as RequestInputsConfig;
        const byId = new Map(config.fields.map((f) => [f.id, f]));
        // Reorder by id, preserving each field's current object (values/name),
        // then append any field not named in the order as a safety net so a
        // stale id list can never drop a field.
        const reordered = orderedFieldIds.map((id) => byId.get(id)).filter((f): f is RequestField => Boolean(f));
        for (const f of config.fields) if (!orderedFieldIds.includes(f.id)) reordered.push(f);
        return { ...n, data: { ...n.data, config: { ...config, fields: reordered } } };
      });
      return {
        past: [...state.past, snapshotOf(state)],
        future: [],
        nodes: nextNodes,
        dirty: true,
      };
    });
  },

  disconnect: (edgeId) => {
    set((state) => ({
      past: [...state.past, snapshotOf(state)],
      future: [],
      edges: state.edges.filter((e) => e.id !== edgeId),
      dirty: true,
    }));
  },

  // React Flow's onSelectionChange fires from its own internal recomputation
  // whenever the `nodes`/`edges` props change identity (e.g. any
  // updateNodeConfig call) — not only on an actual user selection click. If
  // this always wrote a new array, that set() would itself be a state change
  // Zustand re-renders for, which can retrigger onSelectionChange again and
  // loop ("Maximum update depth exceeded"). Skipping the write when the ids
  // are unchanged (same length/order) breaks that cycle at the source.
  setSelection: (ids) => {
    const current = get().selection;
    if (current.length === ids.length && current.every((id, i) => id === ids[i])) return;
    set({ selection: ids });
  },

  undo: () => {
    const state = get();
    const previous = state.past[state.past.length - 1];
    if (!previous) return;
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: state.past.slice(0, -1),
      future: [snapshotOf(state), ...state.future],
      dirty: true,
    });
  },

  redo: () => {
    const state = get();
    const next = state.future[0];
    if (!next) return;
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...state.past, snapshotOf(state)],
      future: state.future.slice(1),
      dirty: true,
    });
  },

  toGraph: () => toWorkflowGraph(get().nodes, get().edges),

  applyRealtime: (nodeId, status, output) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId && !isStickyNoteNode(n)
          ? { ...n, data: { ...n.data, status, output: output ?? n.data.output } }
          : n,
      ),
    }));
  },

  setRunId: (runId) => set({ runId }),
  markSaved: (savedAt) => set({ dirty: false, savedAt }),

  /** Debounced 600ms autosave; the caller (page component) owns the actual PATCH + 409 reconciliation. */
  scheduleAutosave: (save) => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      const state = get();
      if (!state.dirty) return;
      save(toWorkflowGraph(state.nodes, state.edges), state.savedAt);
    }, 600);
  },
}));
