"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  inputs: Record<string, unknown> | null;
  output: unknown;
}

/** "820ms" / "3.4s" — compact, matching the run-level pill. */
function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Renders a node input/output value compactly: strings verbatim, everything else as JSON. */
function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  return JSON.stringify(value);
}

/** Node output is a JSON blob (e.g. { text } for Gemini, { output_image } for Crop) — normalize to a record for DetailFields. */
function toRecord(output: unknown): Record<string, unknown> | null {
  if (output == null) return null;
  if (typeof output === "object" && !Array.isArray(output)) return output as Record<string, unknown>;
  return { result: output };
}

/** Labelled key/value list for a node's inputs/output map (LLD §7 details view). */
function DetailFields({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  const entries = data ? Object.entries(data).filter(([, v]) => v != null && v !== "") : [];
  if (entries.length === 0) return null;
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-label-muted">{label}</span>
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1.5 text-[11px]">
          <span className="shrink-0 text-label-muted">{key}:</span>
          <span className="min-w-0 break-words text-text-muted">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<RunDetail | null>(null);
  const [filter, setFilter] = useState<(typeof RUN_FILTERS)[number]>("All");

  // One refresh = the run list plus (if a run is open) its live node-level
  // detail. Node state is driven server-side by Trigger.dev; the canvas gets it
  // over Realtime, but this DB-backed panel has no subscription, so both the
  // list AND the expanded detail must be refetched — previously the detail was
  // fetched once on expand and never again, which is why a finished node kept
  // showing "pending" until the panel was closed and reopened.
  const load = useCallback(() => {
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((r) => r.json() as Promise<RunSummary[]>)
      .then(setRuns);
    if (expandedId) {
      fetch(`/api/runs/${expandedId}`)
        .then((r) => r.json() as Promise<RunDetail>)
        .then(setExpanded);
    }
  }, [workflowId, expandedId]);

  // Initial load, on external bumps (run start/finish), and when a different
  // run is expanded.
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Live polling while any run is still running: re-poll every 2s and self-stop
  // once everything is terminal. This is what makes statuses/outputs stream in
  // without a manual close/reopen.
  useEffect(() => {
    if (!runs.some((r) => r.status === "running")) return;
    const timer = setTimeout(load, 2000);
    return () => clearTimeout(timer);
  }, [runs, load]);

  function toggleExpand(runId: string) {
    if (expandedId === runId) {
      setExpandedId(null);
      setExpanded(null);
      return;
    }
    setExpandedId(runId);
    setExpanded(null); // clear the previous run's detail; `load` fills this one in
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
              <span className="ml-auto text-label-muted">{formatDuration(run.durationMs)}</span>
              <span className="text-label-muted">{new Date(run.startedAt).toLocaleTimeString()}</span>
            </button>
            {expandedId === run.id && (
              <div className="space-y-2 border-t border-divider px-3 py-2">
                {(!expanded || expanded.id !== run.id) && (
                  <p className="text-[11px] text-label-muted">Loading…</p>
                )}
                {expanded?.id === run.id && expanded.nodeExecutions.map((ne) => (
                  <div key={ne.id} className="space-y-1 rounded border border-card-border bg-canvas-bg px-2 py-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="truncate font-medium text-text-muted">{ne.nodeKind}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 ${NODE_BADGE[ne.status]}`}>{ne.status}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-label-muted">{formatDuration(ne.durationMs)}</span>
                    </div>
                    <DetailFields label="Inputs" data={ne.inputs} />
                    <DetailFields label="Output" data={toRecord(ne.output)} />
                    {ne.errorMessage && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-red-500">Error</span>
                        <p className="break-words text-[11px] text-red-500">{ne.errorMessage}</p>
                      </div>
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
