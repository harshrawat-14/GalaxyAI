"use client";

import { Background, BackgroundVariant, MiniMap, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Copy, Pencil } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { NODE_COMPONENTS } from "@/components/nodes";
import { RunControllerProvider } from "@/components/canvas/RunController";
import type { WorkflowGraph } from "@/domain/types";
import { EDGE_TYPE, graphEdgeToRF, graphNodeToRF, stickyNoteToRF } from "@/store/workflow-store";
import { TypedEdge } from "@/components/canvas/TypedEdge";

const EDGE_TYPES = { [EDGE_TYPE]: TypedEdge };

// Single color for every node, unlike the builder's per-role minimap — this
// is a read-only structural preview, not distinguishing executable vs static.
const MM_PREVIEW_ALL = "#A88BFA";

/**
 * `onClone` set (system-workflow templates, src/app/templates/[id]/page.tsx)
 * swaps "Edit Workflow" for "Clone Workflow" — templates aren't user-owned
 * rows, so there's nothing to navigate into editing; cloning is what creates
 * the user's own real, editable copy.
 */
export function WorkflowPreviewTab({
  workflowId,
  graph,
  onClone,
}: {
  workflowId: string;
  graph: WorkflowGraph;
  onClone?: () => void;
}) {
  const router = useRouter();
  // initialWidth/initialHeight are xyflow's documented pre-measurement
  // fallback (read by nodeHasDimensions/getNodeDimensions) — without them
  // MiniMap's node rects render only once the real ResizeObserver pass
  // lands, which never happened reliably in this read-only tree; an
  // approximate guess is fine since real measurement still overrides it.
  const nodes = useMemo(
    () => [
      ...graph.nodes.map((n) => ({ ...graphNodeToRF(n), draggable: false, initialWidth: 256, initialHeight: 160 })),
      ...graph.stickyNotes.map((note) => ({ ...stickyNoteToRF(note), draggable: false })),
    ],
    [graph],
  );
  // data.readOnly suppresses TypedEdge's hover-to-delete affordance — this is
  // a read-only structural preview, not the builder.
  const edges = useMemo(
    () => graph.edges.map((e) => ({ ...graphEdgeToRF(e), data: { readOnly: true } })),
    [graph],
  );

  return (
    <div className="rounded-card border border-card-border bg-detail-card p-6 shadow-card">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl font-bold text-text-strong">Workflow Structure</h2>
        {onClone ? (
          <button
            type="button"
            data-testid="clone-workflow-button"
            onClick={onClone}
            className="flex items-center gap-1.5 rounded-[10px] border border-card-border bg-detail-card px-3 py-2 text-sm font-medium text-text-strong hover:bg-control-hover"
          >
            <Copy size={14} /> Clone Workflow
          </button>
        ) : (
          <button
            type="button"
            data-testid="edit-workflow-button"
            onClick={() => router.push(`/workflow/${workflowId}/edit`)}
            className="flex items-center gap-1.5 rounded-[10px] border border-card-border bg-detail-card px-3 py-2 text-sm font-medium text-text-strong hover:bg-control-hover"
          >
            <Pencil size={14} /> Edit Workflow
          </button>
        )}
      </div>
      <div className="border-t border-divider" />

      <div
        data-testid="workflow-preview-canvas"
        // pointer-events-none on each node's own content blocks every in-node
        // affordance (run/menu/upload/etc.) while leaving the pane itself
        // (the parent) free for pan/zoom — a read-only view without touching
        // the shared node components themselves. Needs the `!` (important)
        // modifier: xyflow sets `pointer-events: all` as an inline style on
        // each node, which otherwise always wins over a plain class rule.
        // The `__` in the class name must be escaped (`\_\_`) — Tailwind
        // otherwise reads unescaped underscores in an arbitrary selector as
        // spaces, turning `.react-flow__node` into a broken `.react-flow node`
        // descendant selector that silently never matches anything.
        className="relative mt-4 h-[520px] overflow-hidden rounded-lg bg-detail-content [&_.react-flow\_\_node]:!pointer-events-none"
      >
        <ReactFlowProvider>
          {/* NodeShell's header controls call useRunController() unconditionally —
              this provider is required just to satisfy that hook; the run/menu
              buttons it would expose are unreachable (pointer-events-none above). */}
          <RunControllerProvider workflowId={workflowId} onRunsChanged={() => {}}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_COMPONENTS}
              edgeTypes={EDGE_TYPES}
              colorMode="light"
              nodesDraggable={false}
              nodesConnectable={false}
              edgesFocusable={false}
              panOnDrag
              zoomOnScroll
              zoomOnPinch
              fitView
              proOptions={{ hideAttribution: true }}
            >
              {/* size=1.5 -> r=size/2=0.75, half the previous 1.5px radius. */}
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#CACACA" />
            </ReactFlow>
            {/* Sibling of <ReactFlow>, not a child — matches CollapsibleMiniMap's
                structure (the only arrangement that actually populates minimap
                node rects here; xyflow's MiniMapNodes failed to pick up node
                dimensions when nested inside <ReactFlow>'s own children). Always
                expanded, no minimize control here (that toggle is builder-only) —
                pannable/zoomable make it a real navigation aid, not a thumbnail.
                MiniMap's own `position` prop absolutely-positions it relative
                to whatever ancestor happens to be positioned — outside the
                clipped/relative canvas div, that escaped the card's bounds.
                Same fix as CollapsibleMiniMap: this div supplies the actual
                bottom-right placement, and `!static !inset-auto !m-0` strips
                MiniMap's own positioning so it just fills this div instead. */}
            <div className="absolute bottom-3 right-3 z-10">
              <MiniMap
                pannable
                zoomable
                nodeColor={MM_PREVIEW_ALL}
                bgColor="#18181B"
                maskColor="rgba(24,24,27,.6)"
                className="!static !inset-auto !m-0 !rounded-panel !border !border-mm-border"
              />
            </div>
          </RunControllerProvider>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
