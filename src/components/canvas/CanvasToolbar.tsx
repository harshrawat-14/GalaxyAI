"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  Keyboard,
  Maximize2,
  Move,
  Network,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRef, useState } from "react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useWorkflowStore } from "@/store/workflow-store";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘Z", label: "Undo" },
  { keys: "⌘⇧Z", label: "Redo" },
  { keys: "Delete", label: "Remove selected" },
];

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-control-hover ${active ? "bg-control-hover" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-divider" />;
}

/**
 * Single horizontal floating toolbar replacing React Flow's vertical
 * <Controls> — undo/redo, zoom, fit-view, grid toggle, pan toggle. Wired
 * directly to the React Flow instance in scope (must render inside the
 * same ReactFlowProvider as <ReactFlow>, per Canvas.tsx).
 */
export function CanvasToolbar({
  onAutoArrange,
  panMode,
  onTogglePan,
}: {
  onAutoArrange: () => void;
  panMode: boolean;
  onTogglePan: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const collapsed = useWorkflowStore((s) => s.toolbarCollapsed);
  const toggleCollapsed = useWorkflowStore((s) => s.toggleToolbarCollapsed);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(shortcutsRef, shortcutsOpen, () => setShortcutsOpen(false));

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Expand toolbar"
        onClick={toggleCollapsed}
        className="absolute bottom-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-card-bg text-zinc-600 shadow-card hover:bg-control-hover"
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex h-12 items-center gap-0.5 rounded-panel bg-card-bg px-1.5 shadow-card">
      <ToolbarButton label="Collapse toolbar" onClick={toggleCollapsed}>
        <ChevronLeft size={18} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Undo" onClick={undo}>
        <Undo2 size={18} />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={redo}>
        <Redo2 size={18} />
      </ToolbarButton>
      <div ref={shortcutsRef} className="relative">
        <ToolbarButton label="Keyboard shortcuts" active={shortcutsOpen} onClick={() => setShortcutsOpen((o) => !o)}>
          <Keyboard size={18} />
        </ToolbarButton>
        {shortcutsOpen && (
          <div className="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-panel border border-card-border bg-card-bg p-2 shadow-card-hover">
            {SHORTCUTS.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2 whitespace-nowrap px-1 py-1 text-xs">
                <span className="text-text-muted">{s.label}</span>
                <kbd className="rounded bg-control-hover px-1.5 py-0.5 font-mono text-[11px] text-text-strong">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      <ToolbarButton label="Zoom out" onClick={() => zoomOut()}>
        <ZoomOut size={18} />
      </ToolbarButton>
      <span data-testid="zoom-level" className="w-10 select-none text-center text-xs text-text-muted">
        {Math.round(zoom * 100)}%
      </span>
      <ToolbarButton label="Zoom in" onClick={() => zoomIn()}>
        <ZoomIn size={18} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Fit view" onClick={() => fitView()}>
        <Maximize2 size={18} />
      </ToolbarButton>
      <ToolbarButton
        label="Auto-arrange"
        onClick={() => {
          onAutoArrange();
          // Let React Flow apply the new positions, then frame them.
          setTimeout(() => fitView({ padding: 0.2, duration: 400, maxZoom: 1 }), 60);
        }}
      >
        <Network size={18} />
      </ToolbarButton>
      <ToolbarButton label={panMode ? "Switch to select mode" : "Switch to pan mode"} active={panMode} onClick={onTogglePan}>
        {panMode ? <Hand size={18} /> : <Move size={18} />}
      </ToolbarButton>
    </div>
  );
}
