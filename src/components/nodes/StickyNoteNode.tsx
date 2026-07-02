"use client";

import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkflowStore, type StickyNoteRFNode } from "@/store/workflow-store";

export const STICKY_NOTE_COLORS = ["#FEF08A", "#BFDBFE", "#BBF7D0", "#FBCFE8", "#DDD6FE", "#FED7AA"] as const;

const FONT_FAMILIES: Record<string, string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  mono: "ui-monospace, 'SF Mono', monospace",
  casual: "'Comic Sans MS', 'Segoe Print', cursive",
};

const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 32;

/**
 * Purely visual canvas annotation — see StickyNoteNodeData's doc comment in
 * workflow-store.ts. Renders via React Flow's own `nodes` array (for free
 * drag/resize/pan/zoom) but is never a NodeSpec entry, never has handles, and
 * is filtered out before the domain layer or a run ever sees it.
 */
export function StickyNoteNode({ id, data, selected }: NodeProps<StickyNoteRFNode>) {
  const updateStickyNote = useWorkflowStore((s) => s.updateStickyNote);
  const resizeStickyNote = useWorkflowStore((s) => s.resizeStickyNote);
  const [editing, setEditing] = useState(false);

  // Deselecting (e.g. clicking elsewhere on the canvas) always exits edit mode.
  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const textStyle = {
    backgroundColor: data.color,
    color: "#44403C",
    fontSize: data.fontSize,
    fontWeight: data.bold ? 700 : 400,
    fontFamily: FONT_FAMILIES[data.fontFamily] ?? FONT_FAMILIES.sans,
  };

  return (
    <div className="relative h-full w-full" data-testid="sticky-note" style={{ minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT }}>
      <NodeResizer
        nodeId={id}
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        onResizeEnd={(_, params) => resizeStickyNote(id, { width: params.width, height: params.height })}
      />

      {selected && (
        <div
          data-testid="sticky-note-toolbar"
          className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 flex-col items-center gap-2 rounded-panel bg-white p-2 shadow-card-hover"
        >
          <div className="flex flex-col gap-1">
            {STICKY_NOTE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Sticky note color ${color}`}
                data-testid="sticky-note-color"
                data-color={color}
                onClick={() => updateStickyNote(id, { color })}
                className="h-5 w-5 rounded-full border border-card-border"
                style={{
                  backgroundColor: color,
                  outline: data.color === color ? "2px solid #6D5DFB" : "none",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>

          <div className="h-px w-full bg-divider" />

          <button
            type="button"
            aria-label="Toggle bold"
            data-testid="sticky-note-bold"
            aria-pressed={data.bold}
            onClick={() => updateStickyNote(id, { bold: !data.bold })}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${
              data.bold ? "bg-zinc-800 text-white" : "text-text-muted hover:bg-control-hover"
            }`}
          >
            B
          </button>

          <div className="h-px w-full bg-divider" />

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Increase font size"
              data-testid="sticky-note-font-inc"
              onClick={() => updateStickyNote(id, { fontSize: Math.min(MAX_FONT_SIZE, data.fontSize + 2) })}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-control-hover"
            >
              <Plus size={12} />
            </button>
            <span data-testid="sticky-note-font-size" className="text-xs text-text-muted">
              {data.fontSize}
            </span>
            <button
              type="button"
              aria-label="Decrease font size"
              data-testid="sticky-note-font-dec"
              onClick={() => updateStickyNote(id, { fontSize: Math.max(MIN_FONT_SIZE, data.fontSize - 2) })}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-control-hover"
            >
              <Minus size={12} />
            </button>
          </div>

          <div className="h-px w-full bg-divider" />

          <div className="flex flex-col gap-1">
            {Object.entries(FONT_FAMILIES).map(([key, stack]) => (
              <button
                key={key}
                type="button"
                aria-label={`Font ${key}`}
                data-testid="sticky-note-font-family"
                data-font={key}
                onClick={() => updateStickyNote(id, { fontFamily: key })}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs ${
                  data.fontFamily === key ? "bg-control-hover text-text-strong" : "text-text-muted hover:bg-control-hover"
                }`}
                style={{ fontFamily: stack }}
              >
                Aa
              </button>
            ))}
          </div>
        </div>
      )}

      {editing ? (
        <textarea
          data-testid="sticky-note-text"
          autoFocus
          value={data.text}
          onChange={(e) => updateStickyNote(id, { text: e.target.value })}
          onBlur={() => setEditing(false)}
          placeholder="Type a note…"
          className="nodrag nopan h-full w-full resize-none rounded-card border-none p-3 outline-none placeholder:text-[#A8A29E]"
          style={textStyle}
        />
      ) : (
        // First click only selects + drags (default node behavior); a second
        // click on an already-selected note enters edit mode.
        <div
          data-testid="sticky-note-text"
          onClick={() => {
            if (selected) setEditing(true);
          }}
          className="h-full w-full cursor-grab whitespace-pre-wrap rounded-card p-3"
          style={textStyle}
        >
          {data.text || <span style={{ color: "#A8A29E" }}>Type a note…</span>}
        </div>
      )}
    </div>
  );
}
