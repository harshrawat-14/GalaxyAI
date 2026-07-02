"use client";

import { Handle, Position } from "@xyflow/react";
import { Info, Lock, MoreHorizontal, Play, RotateCcw } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useRunController } from "@/components/canvas/RunController";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import type { NodeKind } from "@/domain/nodes";
import type { PortDef, PortType } from "@/domain/ports";
import type { NodeStatus } from "@/domain/types";
import { useWorkflowStore } from "@/store/workflow-store";

const STATUS_BORDER: Record<NodeStatus, string> = {
  pending: "border-card-border",
  running: "border-violet-500 animate-node-glow",
  success: "border-emerald-500",
  failed: "border-red-500",
  skipped: "border-card-border opacity-60",
};

/**
 * Handle color is semantic, not a 1:1 map of `PortType` — Crop's X/Y/Width/
 * Height and Gemini's numeric Settings params (temperature, seed, etc.) are
 * typed "text" structurally (they're wireable from a Request-Inputs text
 * field) but read as quantities, so they get the "number" bucket's pink
 * dot rather than text's orange. Boolean toggle settings (JSON Mode,
 * Reasoning) get the generic/dark bucket ahead of "number" even though
 * they live in the same Settings section, since a boolean isn't a quantity.
 */
const NUMERIC_PORT_IDS = new Set([
  "x", "y", "width", "height",
  "temperature", "max_output_tokens", "top_p", "top_k", "stop_sequences", "seed",
]);
const BOOLEAN_PORT_IDS = new Set(["json_mode", "reasoning"]);

type HandleSemantic = "text" | "media" | "number" | "generic";

function handleSemantic(port: { id: string; type: PortType }): HandleSemantic {
  if (BOOLEAN_PORT_IDS.has(port.id)) return "generic";
  if (NUMERIC_PORT_IDS.has(port.id)) return "number";
  if (port.type === "image" || port.type === "video") return "media";
  if (port.type === "text") return "text";
  return "generic"; // audio, file, any — no bucket of their own in the spec, fall back to the generic/undefined color
}

// `!` (important) is required here: @xyflow/react's own stylesheet sets
// `.react-flow__handle { background-color: var(--xy-handle-background-color-default) }`
// at the same specificity as a plain utility class, and it's injected later
// in the bundle (Canvas.tsx imports it after globals.css loads), so without
// `!important` react-flow's default color silently wins over ours.
const HANDLE_CLASS: Record<HandleSemantic, string> = {
  text: "!bg-[#F59E0B]",
  media: "!bg-[#3B82F6]",
  number: "!bg-[#EC4899]",
  generic: "!bg-[#1F2937]",
};

const HANDLE_HEX: Record<HandleSemantic, string> = {
  text: "#F59E0B",
  media: "#3B82F6",
  number: "#EC4899",
  generic: "#1F2937",
};

export function getHandleColorClass(port: { id: string; type: PortType }): string {
  return HANDLE_CLASS[handleSemantic(port)];
}

export function getHandleColorHex(port: { id: string; type: PortType }): string {
  return HANDLE_HEX[handleSemantic(port)];
}

/**
 * Duplicate / Duplicate with Edges / Lock / Delete — reference app renders
 * this as a plain text list (no leading icons), reachable from both the
 * "•••" header button and a right-click anywhere on the card (NodeShell
 * owns the open/close state so it works even for node kinds like
 * Request-Inputs/Response whose `headerRight` slot replaces the "•••"
 * button entirely — they still get right-click access to Lock/Unlock).
 */
function NodeActionMenu({
  id,
  executable,
  deletable,
  locked,
  onClose,
}: {
  id: string;
  executable: boolean;
  deletable: boolean;
  locked: boolean;
  onClose: () => void;
}) {
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);
  const duplicateNodeWithEdges = useWorkflowStore((s) => s.duplicateNodeWithEdges);
  const toggleNodeLocked = useWorkflowStore((s) => s.toggleNodeLocked);
  const removeNode = useWorkflowStore((s) => s.removeNode);

  return (
    <div
      data-testid="node-context-menu"
      className="absolute right-3 top-11 z-20 w-[220px] rounded-card border border-card-border bg-card-bg py-1 shadow-card-hover"
    >
      {executable && (
        <>
          <button
            type="button"
            data-testid="node-menu-duplicate"
            onClick={() => {
              duplicateNode(id);
              onClose();
            }}
            className="flex h-11 w-full items-center pl-4 text-left text-[16px] text-text-strong hover:bg-control-hover"
          >
            Duplicate
          </button>
          <button
            type="button"
            data-testid="node-menu-duplicate-edges"
            onClick={() => {
              duplicateNodeWithEdges(id);
              onClose();
            }}
            className="flex h-11 w-full items-center pl-4 text-left text-[16px] text-text-strong hover:bg-control-hover"
          >
            Duplicate with Edges
          </button>
          <div className="my-1 h-px bg-divider" />
        </>
      )}
      <button
        type="button"
        data-testid="node-menu-lock"
        onClick={() => {
          toggleNodeLocked(id);
          onClose();
        }}
        className="flex h-11 w-full items-center pl-4 text-left text-[16px] text-text-strong hover:bg-control-hover"
      >
        {locked ? "Unlock" : "Lock"}
      </button>
      {deletable && (
        <button
          type="button"
          data-testid="node-menu-delete"
          onClick={() => {
            removeNode(id);
            onClose();
          }}
          className="flex h-11 w-full items-center pl-4 text-left text-[16px] text-text-strong hover:bg-control-hover"
        >
          Delete
        </button>
      )}
    </div>
  );
}

/**
 * Header info popover + rerun/Run controls (docs/prompts/node-controls.md).
 * Executable kinds (Gemini/Crop) get rerun + Run pill; the "•••" button
 * itself just toggles the parent NodeShell's shared menu state so right-click
 * and the button open the exact same panel.
 */
function NodeHeaderControls({
  id,
  executable,
  description,
  status,
  menuOpen,
  onToggleMenu,
}: {
  id: string;
  executable: boolean;
  description: string;
  status: NodeStatus;
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { startRun, isRunning: anyRunning } = useRunController();
  const running = status === "running";

  useOnClickOutside(rootRef, infoOpen, () => setInfoOpen(false));

  function runThis() {
    startRun([id]);
  }

  return (
    <div ref={rootRef} className="nodrag relative flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Node info"
        data-testid="node-info-button"
        onClick={() => setInfoOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-control-hover"
      >
        <Info size={16} />
      </button>

      {executable && (
        <>
          <button
            type="button"
            aria-label="Rerun this node"
            data-testid="node-rerun-button"
            disabled={anyRunning}
            onClick={runThis}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-control-hover disabled:opacity-50"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            aria-label={running ? "Running" : "Run this node"}
            data-testid="node-run-pill"
            disabled={anyRunning}
            onClick={runThis}
            className="flex items-center gap-1 rounded-md bg-[#DCFCE7] px-3 py-1.5 text-[13px] font-semibold text-[#16A34A] disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" />
            {running ? "Running" : "Run"}
          </button>
        </>
      )}

      <button
        type="button"
        aria-label="More node actions"
        data-testid="node-menu-button"
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-card-border text-text-muted hover:bg-control-hover"
      >
        <MoreHorizontal size={16} />
      </button>

      {infoOpen && (
        <div
          data-testid="node-info-popover"
          className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-card border border-card-border bg-card-bg p-3 text-xs text-text-muted shadow-card"
        >
          {description}
        </div>
      )}
    </div>
  );
}

/**
 * Standalone info icon + popover for Request-Inputs' header (the (i) sits
 * left of the title there, instead of inside NodeHeaderControls on the
 * right) — its own independent open/close state, since it's no longer
 * sharing a single-open "panel" union with a "•••" menu.
 */
export function NodeInfoButton({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, open, () => setOpen(false));

  return (
    <div ref={rootRef} className="nodrag relative shrink-0">
      <button
        type="button"
        aria-label="Node info"
        data-testid="node-info-button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-control-hover"
      >
        <Info size={16} />
      </button>
      {open && (
        <div
          data-testid="node-info-popover"
          className="absolute left-0 top-full z-20 mt-2 w-[260px] rounded-card border border-card-border bg-card-bg p-3 text-xs text-text-muted shadow-card"
        >
          {description}
        </div>
      )}
    </div>
  );
}

/** Outer card chrome shared by every node kind — header, status border, body. */
export function NodeShell({
  id,
  kind,
  label,
  status,
  selected,
  executable,
  deletable,
  description,
  locked,
  children,
  headerLeftExtra,
  headerRight,
  width = "w-64",
}: {
  id: string;
  kind: NodeKind;
  label: string;
  status: NodeStatus;
  selected?: boolean;
  executable: boolean;
  deletable: boolean;
  description: string;
  locked?: boolean;
  children: ReactNode;
  /**
   * Request-Inputs-only header override (docs/prompts/request-inputs-add-menu.md):
   * `headerLeftExtra` renders right after the title (its own info icon, left-
   * aligned) and `headerRight` replaces the standard NodeHeaderControls
   * (its "+" add-field button instead of the "•••" menu). Response reuses
   * the same `headerRight` slot to drop the "•••" menu entirely (docs/prompts/
   * model-and-crop-nodes.md §5/§7) — pass `headerRight={<NodeInfoButton .../>}`
   * for an icon-only header with no menu. Every other node kind omits both.
   */
  headerLeftExtra?: ReactNode;
  headerRight?: ReactNode;
  /** Gemini/Crop use `w-[340px]` (docs/prompts/model-and-crop-nodes.md §2); everything else keeps the original w-64. */
  width?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(cardRef, menuOpen, () => setMenuOpen(false));

  return (
    <div
      ref={cardRef}
      data-testid="node"
      data-node-kind={kind}
      data-status={status}
      data-locked={locked ? "true" : "false"}
      onContextMenu={(e) => {
        // Right-click (2-finger click on trackpad) opens the same action
        // menu as the "•••" button — matches the reference app, and works
        // even for Request-Inputs/Response whose headerRight slot replaces
        // the "•••" button entirely, giving them a way to lock/unlock too.
        e.preventDefault();
        setMenuOpen(true);
      }}
      className={`relative ${width} rounded-card border-2 bg-card-bg text-text-strong transition-all duration-200 ease-out hover:shadow-card-hover ${STATUS_BORDER[status]} ${selected ? "ring-2 ring-[#6366F1] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]" : "shadow-card"}`}
    >
      {locked && (
        <div
          data-testid="node-lock-indicator"
          className="absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-white shadow-card"
        >
          <Lock size={11} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 rounded-t-card border-b border-divider bg-canvas-bg px-4 py-3">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[15px] font-semibold text-text-strong">{label}</span>
          {headerLeftExtra}
        </div>
        {headerRight ?? (
          <NodeHeaderControls
            id={id}
            executable={executable}
            description={description}
            status={status}
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((o) => !o)}
          />
        )}
      </div>
      {/* nodrag: React Flow's documented escape hatch so dragging starts a
          node move instead of, say, selecting textarea content. The actual
          "first click after selecting drops the event" bug this used to also
          carry a stopPropagation() for turned out to be a stale-closure bug
          in setNodes/setEdges (fixed in workflow-store.ts) — stopping
          propagation here was a red herring that also broke Handle
          connection-drag (Handles live inside this div too). */}
      <div className="nodrag space-y-2 px-4 py-4">
        {children}
      </div>

      {menuOpen && (
        <NodeActionMenu
          id={id}
          executable={executable}
          deletable={deletable}
          locked={Boolean(locked)}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * One handle + its label, derived from `spec.inputs/outputs(config)` —
 * never hardcoded (AGENT.md §3). Each node kind decides where in its body
 * to place input vs. output rows.
 */
export function PortRow({
  port,
  direction,
  rightExtra,
  connected,
  addButton,
}: {
  port: PortDef;
  direction: "input" | "output";
  /** Extra controls between the label and the handle dot (e.g. Crop's inline upload control). */
  rightExtra?: ReactNode;
  /**
   * Once wired, the label + rightExtra grey out (opacity-50, pointer-events-none)
   * but stay rendered — never hidden, so layout never shifts. Omit to keep
   * every other PortRow's unchanged default (no greying).
   */
  connected?: boolean;
  /** Rendered outside the greyed wrapper so it can be hidden (not greyed) on connect. */
  addButton?: ReactNode;
}) {
  const isOutput = direction === "output";
  const label = (
    <span
      className={
        connected === undefined ? undefined : `text-text-strong ${connected ? "pointer-events-none opacity-50" : ""}`
      }
    >
      {port.label}
      {port.required && <span className="text-red-400"> *</span>}
    </span>
  );

  return (
    <div
      className={`relative flex items-center gap-2 text-[13px] font-medium text-label-muted ${
        isOutput ? "justify-end pr-3" : "pl-3"
      }`}
    >
      {!isOutput && label}
      {!isOutput && rightExtra && (
        <div className={`ml-auto flex items-center gap-1.5 ${connected ? "pointer-events-none opacity-50" : ""}`}>
          {rightExtra}
        </div>
      )}
      {!isOutput && addButton}
      <Handle
        type={isOutput ? "source" : "target"}
        position={isOutput ? Position.Right : Position.Left}
        id={port.id}
        className={`!h-2.5 !w-2.5 !border-0 ${getHandleColorClass(port)}`}
      />
      {isOutput && label}
    </div>
  );
}
