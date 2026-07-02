"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { NodeStatus, RunStatus } from "@/domain/types";

interface RunSummary {
  id: string;
  scope: string;
  status: RunStatus;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
}

interface NodeExecutionDetail {
  id: string;
  nodeId: string;
  nodeKind: string;
  status: NodeStatus;
  errorMessage: string | null;
  durationMs: number | null;
}

interface RunDetail extends RunSummary {
  nodeExecutions: NodeExecutionDetail[];
}

// "success" uses the exact runpill-bg/runpill-text tokens (docs/UI_PARITY_FIXES.md's
// "in-node Run pill" green) — this run-status badge is the closest existing match.
const RUN_BADGE: Record<RunStatus, string> = {
  running: "bg-violet-100 text-violet-700",
  success: "bg-runpill-bg text-runpill-text",
  failed: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
};

const NODE_BADGE: Record<NodeStatus, string> = {
  pending: "bg-control-hover text-label-muted",
  running: "bg-violet-100 text-violet-700",
  success: "bg-runpill-bg text-runpill-text",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-control-hover text-label-muted",
};

const RUN_FILTERS = ["All", "success", "failed", "partial", "running"] as const;

/** Run history + node-level expand view (LLD §7 `GET /runs/:runId`, §11 badge colors). */
export function HistoryPanel({
  workflowId,
  refreshKey,
  onClose,
}: {
  workflowId: string;
  refreshKey: number;
  onClose?: () => void;
}) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [expanded, setExpanded] = useState<RunDetail | null>(null);
  const [filter, setFilter] = useState<(typeof RUN_FILTERS)[number]>("All");

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((res) => res.json())
      .then(setRuns);
  }, [workflowId, refreshKey]);

  async function toggleExpand(runId: string) {
    if (expanded?.id === runId) {
      setExpanded(null);
      return;
    }
    const res = await fetch(`/api/runs/${runId}`);
    setExpanded(await res.json());
  }

  const filteredRuns = useMemo(
    () => (filter === "All" ? runs : runs.filter((r) => r.status === filter)),
    [runs, filter],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-divider px-3 py-3">
        <h2 className="text-sm font-medium text-text-strong">Execution History</h2>
        {onClose && (
          <button type="button" aria-label="Close history panel" onClick={onClose} className="text-label-muted hover:text-text-strong">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-divider px-3 py-2 text-xs">
        <span className="rounded-full bg-control-hover px-2.5 py-1 font-medium text-text-muted">UI Runs</span>
        {/* NextFlow has no API-run concept — the tab is shown disabled rather
            than faked or omitted, per docs/PARITY_REMEDIATION_PLAN.md D4. */}
        <span aria-disabled="true" className="cursor-not-allowed rounded-full px-2.5 py-1 text-label-muted">
          API Runs
        </span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof RUN_FILTERS)[number])}
          data-testid="history-filter"
          className="ml-auto rounded border border-card-border bg-card-bg px-1.5 py-1 text-xs text-text-muted"
        >
          {RUN_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "All" ? "All" : f}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filteredRuns.length === 0 && <p className="text-xs text-label-muted">No runs for this filter yet.</p>}
        {filteredRuns.map((run) => (
          <div
            key={run.id}
            data-testid="history-run-row"
            data-run-status={run.status}
            className="rounded-card border border-card-border bg-card-bg"
          >
            <button
              type="button"
              onClick={() => toggleExpand(run.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-text-muted"
            >
              <span className={`rounded px-1.5 py-0.5 font-medium ${RUN_BADGE[run.status]}`}>{run.status}</span>
              <span className="text-label-muted">{run.scope}</span>
              <span className="text-label-muted">{new Date(run.startedAt).toLocaleTimeString()}</span>
            </button>
            {expanded?.id === run.id && (
              <div className="space-y-1 border-t border-divider px-3 py-2">
                {expanded.nodeExecutions.map((ne) => (
                  <div key={ne.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-label-muted">{ne.nodeKind}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 ${NODE_BADGE[ne.status]}`}>{ne.status}</span>
                    {ne.errorMessage && (
                      <span className="truncate text-red-500" title={ne.errorMessage}>
                        {ne.errorMessage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
