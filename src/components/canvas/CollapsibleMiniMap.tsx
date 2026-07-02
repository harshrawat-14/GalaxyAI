"use client";

import { MiniMap } from "@xyflow/react";
import { Map, Minimize2 } from "lucide-react";
import { useState } from "react";
import type { NodeKind } from "@/domain/nodes";
import { isStickyNoteNode, type AnyCanvasNode } from "@/store/workflow-store";

// Mirrors tailwind.config.ts's mm-static/mm-active tokens — kept as literal
// hex here since nodeColor is a plain JS callback, not a className.
const MM_STATIC = "#444444"; // Request-Inputs, Response, sticky notes
const MM_ACTIVE = "#22C55E"; // Gemini (LLM) and Crop (image-processing)
const ACTIVE_KINDS = new Set<NodeKind>(["gemini", "crop-image"]);

/** Builder minimap node fill: static (input/output/notes) vs active (executable). */
function minimapNodeColor(node: AnyCanvasNode): string {
  if (isStickyNoteNode(node)) return MM_STATIC;
  return ACTIVE_KINDS.has(node.data.kind as NodeKind) ? MM_ACTIVE : MM_STATIC;
}

/**
 * Bottom-right MiniMap, collapsed by default to a small white button.
 * Expanded, it's the one intentionally dark surface in this otherwise light
 * app (docs/UI_PARITY_FIXES.md) — that dark styling is scoped entirely to
 * this component's own panel, never the app shell.
 */
export function CollapsibleMiniMap() {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        aria-label="Expand minimap"
        data-testid="minimap-expand"
        onClick={() => setExpanded(true)}
        className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-card bg-card-bg text-text-muted shadow-card hover:bg-control-hover"
      >
        <Map size={18} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="relative">
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={minimapNodeColor}
          bgColor="#18181B"
          maskColor="rgba(24,24,27,.6)"
          className="!static !inset-auto !m-0 !rounded-panel !border !border-mm-border"
        />
        {/* Sits at the minimap's top-right corner, overlapping it by ~1/4 of
            its own size (button is 28px; -2 = 8px ≈ 1/4 outside each edge).
            Corner radius is also 1/4 of the box's side (28px / 4 = 7px). */}
        <button
          type="button"
          aria-label="Collapse minimap"
          data-testid="minimap-collapse"
          onClick={() => setExpanded(false)}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-[7px] bg-white text-zinc-700 shadow-sm hover:bg-zinc-100"
        >
          <Minimize2 size={14} />
        </button>
      </div>
    </div>
  );
}
