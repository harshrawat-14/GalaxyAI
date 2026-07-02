"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { ParamRow } from "./ParamRow";
import { AddButton } from "./AddButton";

export function TextAreaParam({
  label,
  info,
  dotColor,
  required,
  value,
  onChange,
  placeholder,
  charCount,
  rows = 2,
  portId,
  connected,
  onAdd,
}: {
  label: string;
  info?: string;
  dotColor?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  charCount?: { current: number; max: number };
  rows?: number;
  portId?: string;
  /** Once wired, the textarea greys out (opacity-50, pointer-events-none) but stays rendered — only the "+" hides. */
  connected?: boolean;
  onAdd?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <ParamRow label={label} info={info} dotColor={dotColor} required={required} portId={portId} connected={connected} />
      <div className={`relative ${connected ? "pointer-events-none opacity-50" : ""}`}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={expanded ? rows + 4 : rows}
          data-testid="textarea-param-input"
          className="w-full resize-y rounded-lg border-none bg-zinc-100 px-2 py-1.5 pr-6 text-[13px] text-text-strong placeholder:font-normal placeholder:text-zinc-400 focus:outline-none"
        />
        {charCount && (
          <span className="pointer-events-none absolute bottom-1.5 right-6 text-[10px] text-label-muted">
            {charCount.current}/{charCount.max}
          </span>
        )}
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          data-testid="textarea-param-expand"
          onClick={() => setExpanded((e) => !e)}
          className="absolute bottom-2 right-1 flex h-4 w-4 items-center justify-center text-label-muted hover:text-text-strong"
        >
          <Maximize2 size={11} />
        </button>
      </div>
      {portId && !connected && (
        <div className="mt-1 flex justify-end">
          <AddButton onClick={onAdd} />
        </div>
      )}
    </div>
  );
}
