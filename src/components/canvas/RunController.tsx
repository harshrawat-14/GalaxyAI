"use client";

import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { NodeStatus } from "@/domain/types";
import { useWorkflowStore } from "@/store/workflow-store";

interface RunHandle {
  runId: string;
  tag: string;
  publicToken: string;
}

interface NodeMetadataEntry {
  status?: NodeStatus;
  output?: unknown;
}

const TERMINAL_RUN_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "TIMED_OUT",
  "INTERRUPTED",
  "EXPIRED",
]);

interface RunControllerValue {
  /** scope is derived from nodeIds.length: [] -> full, [one] -> single, [many] -> partial. */
  startRun: (nodeIds: string[]) => void;
  isRunning: boolean;
}

const RunControllerContext = createContext<RunControllerValue | null>(null);

/**
 * Owns the run-trigger + Trigger.dev Realtime subscription (LLD §6, §9) —
 * the SAME mechanism for the top-bar Run/Run-selected buttons (RunControls)
 * and a node header's own Run/Rerun (docs/prompts/node-controls.md), so
 * there is exactly one run-lifecycle implementation. Two-phase start (POST
 * /runs creates the run + tag-scoped token without triggering, then once
 * the subscription below is live, POST /runs/:id/start actually triggers)
 * avoids a fast node finishing before the client ever subscribed.
 */
export function RunControllerProvider({
  workflowId,
  onRunsChanged,
  children,
}: {
  workflowId: string;
  onRunsChanged: () => void;
  children: ReactNode;
}) {
  const toGraph = useWorkflowStore((s) => s.toGraph);
  const applyRealtime = useWorkflowStore((s) => s.applyRealtime);
  const [active, setActive] = useState<RunHandle | null>(null);
  const started = useRef<string | null>(null);

  const { runs } = useRealtimeRunsWithTag(active?.tag ?? "", {
    accessToken: active?.publicToken,
    enabled: Boolean(active),
  });
  const run = runs?.[0];

  useEffect(() => {
    if (!run || !TERMINAL_RUN_STATUSES.has(run.status)) return;
    setActive(null);
    started.current = null;
    onRunsChanged();
  }, [run, onRunsChanged]);

  // Reliability fallback for clearing `isRunning`. The realtime terminal
  // status above is best-effort — if that final update is missed (or the
  // subscription doesn't re-fire), `active` would never clear and EVERY run
  // button would stay disabled forever after a single run. So while a run is
  // active, also poll our own DB status; once the WorkflowRun is terminal
  // (success/failed/partial, i.e. not "running"), clear regardless of realtime.
  useEffect(() => {
    if (!active) return;
    const runId = active.runId;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (!cancelled && data.status && data.status !== "running") {
          setActive((cur) => (cur?.runId === runId ? null : cur));
          started.current = null;
          onRunsChanged();
        }
      } catch {
        // transient network error — the next tick retries
      }
    };
    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, onRunsChanged]);

  useEffect(() => {
    if (!run?.metadata) return;
    for (const [nodeId, value] of Object.entries(run.metadata)) {
      const entry = value as NodeMetadataEntry;
      if (entry?.status) applyRealtime(nodeId, entry.status, entry.output);
    }
  }, [run?.metadata, applyRealtime]);

  useEffect(() => {
    if (!active || started.current === active.runId) return;
    started.current = active.runId;
    fetch(`/api/runs/${active.runId}/start`, { method: "POST" }).then((res) => {
      if (!res.ok) {
        res.json().then((body) => window.alert(body.error ?? "Run failed to start"));
        setActive(null);
      }
    });
  }, [active]);

  async function startRun(nodeIds: string[]) {
    const scope = nodeIds.length === 0 ? "full" : nodeIds.length === 1 ? "single" : "partial";
    const res = await fetch(`/api/workflows/${workflowId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, nodeIds, graph: toGraph() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Run failed to start" }));
      window.alert(body.error ?? "Run failed to start");
      return;
    }
    const handle: RunHandle = await res.json();
    setActive(handle);
    onRunsChanged();
  }

  return (
    <RunControllerContext.Provider value={{ startRun, isRunning: Boolean(active) }}>
      {children}
    </RunControllerContext.Provider>
  );
}

export function useRunController(): RunControllerValue {
  const ctx = useContext(RunControllerContext);
  if (!ctx) throw new Error("useRunController must be used within a RunControllerProvider");
  return ctx;
}
