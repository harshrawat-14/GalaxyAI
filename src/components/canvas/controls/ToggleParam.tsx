"use client";

import { ParamRow } from "./ParamRow";
import { AddButton } from "./AddButton";

export function ToggleParam({
  label,
  info,
  dotColor,
  value,
  onChange,
  portId,
  connected,
  onAdd,
}: {
  label: string;
  info?: string;
  dotColor?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  portId?: string;
  connected?: boolean;
  onAdd?: () => void;
}) {
  return (
    <ParamRow
      label={label}
      info={info}
      dotColor={dotColor}
      portId={portId}
      connected={connected}
      addButton={portId && !connected ? <AddButton onClick={onAdd} /> : undefined}
    >
      <span className="text-[11px] text-label-muted">False</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        data-testid="toggle-param-switch"
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors ${
          value ? "bg-text-strong" : "bg-control-hover"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-[11px] text-label-muted">True</span>
    </ParamRow>
  );
}
