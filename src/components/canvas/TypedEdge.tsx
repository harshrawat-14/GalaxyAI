"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useState } from "react";
import { getHandleColorHex } from "@/components/nodes/NodeShell";
import { getNodeSpec, type NodeKind } from "@/domain/nodes";
import { isStickyNoteNode, useWorkflowStore } from "@/store/workflow-store";

/** Spec requirement ("Animated purple edges") applies only while a run is in
 * flight; idle edges stay solid and colored by the source port's type
 * (docs/UI_PARITY_FIXES.md type palette) to match the live Galaxy.ai reference. */
const EDGE_PURPLE = "#6D5DFB";

export function TypedEdge({
  id,
  source,
  sourceHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const [hovered, setHovered] = useState(false);
  const disconnect = useWorkflowStore((s) => s.disconnect);
  // Read-only previews (WorkflowPreviewTab) feed edges with data.readOnly —
  // no delete affordance there, and disconnect() would act on the builder's
  // global store anyway, not this preview's own local edge list.
  const readOnly = Boolean((data as { readOnly?: boolean } | undefined)?.readOnly);

  const sourceNode = useWorkflowStore((s) => s.nodes.find((n) => n.id === source));
  const running = useWorkflowStore((s) =>
    s.nodes.some((n) => !isStickyNoteNode(n) && n.data.status === "running"),
  );

  const stroke = (() => {
    if (running) return EDGE_PURPLE;
    if (!sourceNode || isStickyNoteNode(sourceNode) || !sourceHandleId) return getHandleColorHex({ id: "", type: "any" });
    const spec = getNodeSpec(sourceNode.data.kind as NodeKind);
    const port = spec.outputs(sourceNode.data.config).find((p) => p.id === sourceHandleId);
    return port ? getHandleColorHex(port) : getHandleColorHex({ id: "", type: "any" });
  })();

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: 2,
          ...(running ? { strokeDasharray: 5, animation: "dashdraw 0.5s linear infinite" } : {}),
        }}
      />
      {/* Wider, invisible hover target — BaseEdge's own built-in interaction
          path doesn't forward onMouseEnter/onMouseLeave, so this is a second,
          additive path purely for hover detection. */}
      {!readOnly && (
        <path
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={20}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      )}
      {!readOnly && hovered && (
        <EdgeLabelRenderer>
          <button
            type="button"
            aria-label="Delete edge"
            data-testid="edge-delete-button"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              disconnect(id);
            }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="z-10 flex h-5 w-5 items-center justify-center rounded-full border-none bg-[#EF4444] text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:bg-[#DC2626]"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
