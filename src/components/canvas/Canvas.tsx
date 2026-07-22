"use client";

import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import { validateConnection } from "@/domain/dag";
import { NODE_COMPONENTS } from "@/components/nodes";
import { EDGE_TYPE, isStickyNoteNode, useWorkflowStore, type AnyCanvasNode } from "@/store/workflow-store";
import { CanvasToolbar } from "./CanvasToolbar";
import { CollapsibleMiniMap } from "./CollapsibleMiniMap";
import { NodePicker } from "./NodePicker";
import { TypedEdge } from "./TypedEdge";

const EDGE_TYPES = { [EDGE_TYPE]: TypedEdge };

function isFullConnection(conn: Connection): conn is Connection & { sourceHandle: string; targetHandle: string } {
  return Boolean(conn.sourceHandle && conn.targetHandle);
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redo — skipped while an
 * editable field has focus so the browser's native text-undo still works. */
function useUndoRedoShortcuts() {
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isModifier = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (!isModifier || (key !== "z" && key !== "y")) return;
      const target = e.target as HTMLElement | null;
      if (target && EDITABLE_TAGS.has(target.tagName)) return;

      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      } else {
        e.preventDefault();
        undo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);
}

export function Canvas() {
  useUndoRedoShortcuts();

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const setSelection = useWorkflowStore((s) => s.setSelection);
  const connect = useWorkflowStore((s) => s.connect);
  const disconnect = useWorkflowStore((s) => s.disconnect);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const removeStickyNote = useWorkflowStore((s) => s.removeStickyNote);
  const autoArrange = useWorkflowStore((s) => s.autoArrange);
  // Toolbar-only view state (not workflow data, so not persisted via the
  // store/autosave) — pan-vs-select drag mode.
  const [panMode, setPanMode] = useState(true);

  // Structural removal (deletable guard, dependent-edge cleanup, undo snapshot)
  // happens in onNodesDelete/onEdgesDelete via the store actions — drop "remove"
  // changes here so they aren't applied twice.
  const onNodesChange: OnNodesChange<AnyCanvasNode> = useCallback(
    (changes) =>
      setNodes((current) => applyNodeChanges(changes.filter((c) => c.type !== "remove"), current)),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((current) => applyEdgeChanges(changes.filter((c) => c.type !== "remove"), current)),
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (conn: Connection) => {
      if (!isFullConnection(conn)) return;
      connect(conn);
    },
    [connect],
  );

  const isValidConnection = useCallback(
    (conn: Edge | Connection) => {
      if (!isFullConnection(conn as Connection)) return false;
      const { source, sourceHandle, target, targetHandle } = conn as Connection & {
        sourceHandle: string;
        targetHandle: string;
      };
      const graph = useWorkflowStore.getState().toGraph();
      return validateConnection(graph, { source, sourceHandle, target, targetHandle }).ok;
    },
    [],
  );

  return (
    <div data-testid="canvas-root" className="relative h-full w-full bg-canvas-bg">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_COMPONENTS}
          edgeTypes={EDGE_TYPES}
          colorMode="light"
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onSelectionChange={({ nodes: selected }) => setSelection(selected.map((n) => n.id))}
          onNodesDelete={(deleted) =>
            deleted.forEach((n) => (isStickyNoteNode(n as AnyCanvasNode) ? removeStickyNote(n.id) : removeNode(n.id)))
          }
          onEdgesDelete={(deleted) => deleted.forEach((e) => disconnect(e.id))}
          deleteKeyCode={["Backspace", "Delete"]}
          panOnDrag={panMode}
          selectionOnDrag={!panMode}
          fitView
          // Cap the INITIAL fit at 100% so a small graph opens at 1:1 (not
          // zoomed in to the 200% max), then the user can zoom freely. Without
          // this, fitView zooms in to maxZoom for graphs smaller than the
          // viewport.
          fitViewOptions={{ maxZoom: 1 }}
          // React Flow defaults to minZoom 0.5, so the "won't zoom past 50%"
          // wall is the default, not a bug — widen it so large fan-out graphs
          // (e.g. the sample workflow) fit fully on screen.
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          {/* size=1.5 -> r=size/2=0.75, half the previous 1.5px radius. Always
              shown — the dot grid is a spec requirement, so there's no toggle. */}
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#CACACA" />
        </ReactFlow>
        <CollapsibleMiniMap />
        <CanvasToolbar
          onAutoArrange={autoArrange}
          panMode={panMode}
          onTogglePan={() => setPanMode((p) => !p)}
        />
        <NodePicker />
      </ReactFlowProvider>
    </div>
  );
}
