"use client";

import { ParamRow } from "./ParamRow";
import { AddButton } from "./AddButton";

export function NumberParam({
  label,
  info,
  dotColor,
  value,
  onChange,
  placeholder,
  portId,
  connected,
  onAdd,
}: {
  label: string;
  info?: string;
  dotColor?: string;
  value: number | "";
  onChange: (value: number | null) => void;
  placeholder?: string;
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
      <input
        type="number"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        data-testid="number-param-input"
        className="w-20 rounded border border-card-border px-2 py-1 text-xs text-text-strong placeholder:text-label-muted"
      />
    </ParamRow>
  );
}
