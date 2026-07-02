"use client";

import { Handle, Position } from "@xyflow/react";
import { Info } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { getHandleColorClass } from "@/components/nodes/NodeShell";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import type { PortType } from "@/domain/ports";

/**
 * Row scaffold reused by every per-param control. The label + optional (i)
 * info popover sit on the left, a free-form control slot on the right.
 * `portId` renders a REAL connectable target Handle (these params are
 * genuinely wireable from Request-Inputs, per the follow-up direction in
 * docs/prompts/model-and-crop-nodes.md's session — the param's own value
 * still always wins at run time; the wire is structural, not a value
 * override) — otherwise falls back to the plain decorative `dotColor` dot.
 */
export function ParamRow({
  label,
  info,
  dotColor,
  required,
  children,
  portId,
  portType = "text",
  connected,
  addButton,
}: {
  label: string;
  info?: string;
  dotColor?: string;
  required?: boolean;
  children?: ReactNode;
  portId?: string;
  portType?: PortType;
  /** Once wired from Request-Inputs, everything but the "+" greys out (opacity-50, pointer-events-none) — it stays rendered, just non-interactive. */
  connected?: boolean;
  /** Rendered outside the greyed wrapper so it can be hidden (not greyed) on connect — pass `undefined` to hide it. */
  addButton?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, open, () => setOpen(false));

  return (
    <div className={`relative flex min-h-[28px] items-center gap-2 ${portId ? "pl-3" : ""}`}>
      <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${connected ? "pointer-events-none opacity-50" : ""}`}>
        {dotColor && !portId && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />}
        <span className="truncate text-[13px] font-medium text-text-strong">
          {label}
          {required && <span className="text-red-400"> *</span>}
        </span>
        {info && (
          <div ref={rootRef} className="nodrag relative shrink-0">
            <button
              type="button"
              aria-label={`${label} info`}
              data-testid="param-info-button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-4 w-4 items-center justify-center text-label-muted hover:text-text-muted"
            >
              <Info size={12} />
            </button>
            {open && (
              <div
                data-testid="param-info-popover"
                className="absolute left-0 top-full z-20 mt-1 w-[220px] rounded-card border border-card-border bg-card-bg p-2 text-xs text-text-muted shadow-card"
              >
                {info}
              </div>
            )}
          </div>
        )}
      </div>
      {children && (
        <div className={`flex shrink-0 items-center gap-1.5 ${connected ? "pointer-events-none opacity-50" : ""}`}>
          {children}
        </div>
      )}
      {addButton}
      {portId && (
        <Handle
          type="target"
          position={Position.Left}
          id={portId}
          className={`!h-2.5 !w-2.5 !border-0 ${getHandleColorClass({ id: portId, type: portType })}`}
        />
      )}
    </div>
  );
}
