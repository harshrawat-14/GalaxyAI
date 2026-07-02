"use client";

import { Play, PlayCircle } from "lucide-react";
import { useRunController } from "@/components/canvas/RunController";
import { useWorkflowStore } from "@/store/workflow-store";

/** Top-bar Run / Run-selected buttons — thin UI over the shared RunControllerProvider (LLD §6, §9). */
export function RunControls() {
  const selection = useWorkflowStore((s) => s.selection);
  const { startRun, isRunning } = useRunController();

  return (
    <div className="flex gap-2">
      {selection.length > 0 && (
        <button
          type="button"
          data-testid="run-selected-button"
          disabled={isRunning}
          onClick={() => startRun(selection)}
          className="flex items-center gap-1 rounded-run bg-card-bg px-3 py-2 text-sm text-text-strong shadow-card hover:bg-control-hover disabled:opacity-50"
        >
          <PlayCircle size={14} /> Run selected
        </button>
      )}
      <button
        type="button"
        aria-label={isRunning ? "Running…" : "Run"}
        data-testid="run-button"
        disabled={isRunning}
        onClick={() => startRun([])}
        className="flex h-10 w-11 items-center justify-center rounded-run bg-run text-white shadow-card hover:bg-run-hover disabled:opacity-50"
      >
        <Play size={18} fill="currentColor" />
      </button>
    </div>
  );
}
