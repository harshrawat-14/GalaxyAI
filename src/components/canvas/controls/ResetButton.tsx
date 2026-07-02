"use client";

import { RotateCcw } from "lucide-react";

export function ResetButton({ onClick, label = "Reset to default" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid="param-reset-button"
      onClick={onClick}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-control-hover"
    >
      <RotateCcw size={14} />
    </button>
  );
}
