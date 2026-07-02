"use client";

import { Plus } from "lucide-react";

/**
 * Visual parity only (docs/prompts/model-and-crop-nodes.md §1): the reference
 * exposes every param as its own connectable input port. Wiring that up is
 * out of scope here — this renders the same "+" affordance but is a no-op.
 * // TODO: expose param as input (wire a real port + Handle, then connect
 * // this button to whatever "promote param to port" store action gets built).
 */
export function AddButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Expose as input (not yet wired)"
      data-testid="param-add-button"
      onClick={onClick ?? (() => {})}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-card-border text-text-muted hover:bg-control-hover"
    >
      <Plus size={14} />
    </button>
  );
}
