"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight, Crop, Plus, Search, Sparkles, StickyNote } from "lucide-react";
import type { ComponentType } from "react";
import { getNodeSpec, NODE_KINDS, type NodeKind } from "@/domain/nodes";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useWorkflowStore } from "@/store/workflow-store";

/** Request-Inputs/Response are pre-placed and non-deletable — not offered here. */
const ADDABLE_KINDS = NODE_KINDS.filter((kind) => getNodeSpec(kind).deletable);

/**
 * Picker-only presentation metadata (separate from domain `category`, which
 * is an engine input/output classification). Group + subtitle mirror the
 * reference app's own search-result labels, e.g. "Gemini 3.1 Pro / Others •
 * LLM Call" — both of NextFlow's current addable nodes fall under "Others"
 * there too, so that's not an approximation, it's the matched behavior.
 * "Recent" is intentionally omitted: there's no usage-tracking data to
 * source it from, and fabricating one would violate the no-fabrication rule.
 */
const PICKER_GROUP: Record<NodeKind, "Image" | "Video" | "Audio" | "Others"> = {
  "request-inputs": "Others",
  "crop-image": "Others",
  gemini: "Others",
  response: "Others",
};
const PICKER_SUBTITLE: Record<NodeKind, string> = {
  "request-inputs": "Input",
  "crop-image": "Utility",
  gemini: "LLM Call",
  response: "Output",
};
const PICKER_ICON: Record<NodeKind, ComponentType<{ size?: number }>> = {
  "request-inputs": Plus,
  "crop-image": Crop,
  gemini: Sparkles,
  response: Plus,
};

const GROUP_ORDER = ["Image", "Video", "Audio", "Others"] as const;

/**
 * Add-node pill, bottom-center beside the main toolbar (CanvasToolbar.tsx).
 * Export/Import now live on the dashboard (per-card "..." menu / the
 * top-bar Import button) instead of here — a whole-workflow operation
 * belongs with the workflow list, not the canvas.
 */
export function NodePicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const addNode = useWorkflowStore((s) => s.addNode);
  const addStickyNote = useWorkflowStore((s) => s.addStickyNote);

  useOnClickOutside(rootRef, open, () => {
    setOpen(false);
    setQuery("");
  });

  function handleAdd(kind: (typeof ADDABLE_KINDS)[number]) {
    addNode(kind, { x: 280 + Math.random() * 80, y: 160 + Math.random() * 80 });
    setOpen(false);
    setQuery("");
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = ADDABLE_KINDS.filter((kind) => getNodeSpec(kind).label.toLowerCase().includes(q));
    return GROUP_ORDER.map((group) => ({
      group,
      kinds: matches.filter((kind) => PICKER_GROUP[kind] === group),
    })).filter(({ kinds }) => kinds.length > 0);
  }, [query]);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex h-10 -translate-x-1/2 items-center gap-1 rounded-panel bg-card-bg px-1.5 shadow-card">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-label="Add node"
          data-testid="node-picker-toggle"
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-control-hover"
        >
          <Plus size={18} />
        </button>
        {open && (
          <div
            data-testid="node-picker-menu"
            className="absolute bottom-full left-0 mb-2 w-64 rounded-panel border border-card-border bg-card-bg p-1 shadow-card-hover"
          >
            <div className="flex items-center gap-2 border-b border-divider px-2 py-1.5">
              <Search size={14} className="shrink-0 text-label-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes or models..."
                data-testid="node-picker-search"
                className="w-full bg-transparent text-sm text-text-strong placeholder:text-label-muted focus:outline-none"
              />
            </div>
            {grouped.length === 0 && <p className="px-3 py-2 text-xs text-label-muted">No matches.</p>}
            {grouped.map(({ group, kinds }) => (
              <div key={group} className="py-1">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-label-muted">{group}</p>
                {kinds.map((kind) => {
                  const Icon = PICKER_ICON[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      data-testid="node-picker-item"
                      data-node-kind={kind}
                      onClick={() => handleAdd(kind)}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-text-muted hover:bg-control-hover"
                    >
                      <Icon size={14} />
                      <span className="flex-1 truncate">
                        {getNodeSpec(kind).label}
                        <span className="ml-1 text-xs text-label-muted">• {PICKER_SUBTITLE[kind]}</span>
                      </span>
                      <ChevronRight size={14} className="shrink-0 text-label-muted" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Add sticky note"
        data-testid="add-sticky-note"
        onClick={() => addStickyNote({ x: 280 + Math.random() * 80, y: 160 + Math.random() * 80 })}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-control-hover"
      >
        <StickyNote size={18} />
      </button>
    </div>
  );
}
