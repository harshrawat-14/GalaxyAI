"use client";

import { ParamRow } from "./ParamRow";
import { ResetButton } from "./ResetButton";
import { AddButton } from "./AddButton";

export function SliderParam({
  label,
  info,
  dotColor,
  value,
  min,
  max,
  step,
  onChange,
  onReset,
  portId,
  connected,
  onAdd,
}: {
  label: string;
  info?: string;
  dotColor?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset: () => void;
  /** Real Handle id — see ParamRow. Omit to keep the old decorative-dot-only look. */
  portId?: string;
  /** Once wired from Request-Inputs, the slider/number/reset grey out (opacity-50, pointer-events-none) — only the "+" hides. */
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
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid="slider-param-range"
        className="h-1 w-20 accent-run"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid="slider-param-number"
        className="w-14 rounded border border-card-border px-1.5 py-1 text-xs text-text-strong"
      />
      <ResetButton onClick={onReset} />
    </ParamRow>
  );
}
