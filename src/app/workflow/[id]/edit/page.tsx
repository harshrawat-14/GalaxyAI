"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, History } from "lucide-react";
import { Canvas } from "@/components/canvas/Canvas";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { RunControllerProvider } from "@/components/canvas/RunController";
import { RunControls } from "@/components/canvas/RunControls";
import { UsagePills } from "@/components/canvas/UsagePills";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import type { WorkflowGraph } from "@/domain/types";
import { CANDIDATE_LINKEDIN_URL } from "@/lib/constants";
import { useWorkflowStore } from "@/store/workflow-store";

interface WorkflowResponse {
  id: string;
  name: string;
  graph: WorkflowGraph;
  updatedAt: string;
  graphVersion: number;
}

// Serializes every save through one promise chain — without this, a slow PATCH
// (#1) still in flight when the next debounce fires (#2) lets both run
// concurrently; #2 reads `savedAt` before #1's response updates it, so #2
// reaches the server with a stale concurrency token even though its own body
// already contains every edit so far. The 409 that follows used to be
// "resolved" by reloading the server's copy — which is #1's content only,
// silently discarding whatever was edited between #1 firing and #2 firing.
// Chaining ensures #2's underlying request never starts until #1 (and its
// own retries) have fully settled.
let pendingSave: Promise<void> = Promise.resolve();

function persistGraph(id: string, graph: WorkflowGraph, expectedVersion: number | null): Promise<void> {
  pendingSave = pendingSave.then(() => doPersist(id, graph, expectedVersion));
  return pendingSave;
}

const MAX_CONFLICT_RETRIES = 5;

async function doPersist(
  id: string,
  graph: WorkflowGraph,
  expectedVersion: number | null,
  attempt = 0,
): Promise<void> {
  const res = await fetch(`/api/workflows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph, expectedVersion }),
  });

  if (res.status === 409) {
    const fresh: WorkflowResponse = await fetch(`/api/workflows/${id}`).then((r) => r.json());
    if (attempt >= MAX_CONFLICT_RETRIES) {
      // Persistent conflict (e.g. another tab saving just as often) — fall
      // back to reconciling from the server rather than retrying forever.
      useWorkflowStore.getState().load(fresh.id, fresh.graph, fresh.graphVersion);
      return;
    }
    // Stale concurrency token only — re-read the CURRENT live graph (not the
    // `graph` argument, which may itself now be stale) and retry with the
    // server's latest `graphVersion`, so edits made while this save was
    // in flight are carried forward instead of lost.
    const currentGraph = useWorkflowStore.getState().toGraph();
    return doPersist(id, currentGraph, fresh.graphVersion, attempt + 1);
  }
  if (res.ok) {
    const updated: WorkflowResponse = await res.json();
    useWorkflowStore.getState().markSaved(updated.graphVersion);
  }
}

export default function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const load = useWorkflowStore((s) => s.load);
  const scheduleAutosave = useWorkflowStore((s) => s.scheduleAutosave);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const loggedAttribution = useRef(false);

  const [workflowName, setWorkflowName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [exiting, setExiting] = useState(false);
  // Gates rendering the interactive canvas until the initial load() lands —
  // without this, a real user (slow network) or a fast script can interact
  // with an empty, not-yet-loaded canvas before the fetch resolves, and the
  // late load() then overwrites whatever they just added (confirmed via
  // Playwright as a real, reproducible race, not a hypothetical one).
  const [loaded, setLoaded] = useState(false);

  const onRunsChanged = useCallback(() => setHistoryRefreshKey((k) => k + 1), []);

  // Required attribution log — exactly once on first client render (AGENT.md §2.5).
  useEffect(() => {
    if (loggedAttribution.current) return;
    loggedAttribution.current = true;
    console.log(`[Py] Candidate LinkedIn: ${CANDIDATE_LINKEDIN_URL}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workflows/${id}`)
      .then((res) => res.json())
      .then((workflow: WorkflowResponse) => {
        if (cancelled) return;
        // Skip a redundant load() (e.g. React Strict Mode's dev-only
        // double-invoke) — but still flip `loaded`, since the data is
        // already in the store from whichever call won the race.
        if (useWorkflowStore.getState().workflowId !== workflow.id) {
          load(workflow.id, workflow.graph, workflow.graphVersion);
        }
        setWorkflowName(workflow.name);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, load]);

  useEffect(() => {
    scheduleAutosave((graph, expectedVersion) => persistGraph(id, graph, expectedVersion));
  }, [nodes, edges, id, scheduleAutosave]);

  async function exitToDetail() {
    if (exiting) return;
    setExiting(true);
    const state = useWorkflowStore.getState();
    if (state.dirty) {
      await persistGraph(id, state.toGraph(), state.savedAt);
    }
    router.push(`/workflow/${id}`);
  }

  if (!loaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg text-sm text-text-muted">
        Loading…
      </div>
    );
  }

  return (
    <RunControllerProvider workflowId={id} onRunsChanged={onRunsChanged}>
      <div className="flex h-screen w-screen overflow-hidden">
        <CanvasSidebar />

        <div className="relative flex-1 overflow-hidden">
          <Canvas />

          <div className="absolute left-4 top-4 z-20">
            <button
              type="button"
              aria-label="Back to workflow details"
              onClick={exitToDetail}
              disabled={exiting}
              data-testid="workflow-name-pill"
              className="flex h-11 items-center gap-2 rounded-[10px] bg-card-bg px-3.5 py-2 shadow-card hover:bg-control-hover disabled:opacity-60"
            >
              <ArrowLeft size={20} className="shrink-0 text-text-muted" />
              <span className="max-w-[260px] truncate text-[15px] font-semibold text-text-strong">{workflowName}</span>
            </button>
          </div>

          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <UsagePills refreshKey={historyRefreshKey} />
            <RunControls />
            <button
              type="button"
              aria-label="History"
              data-testid="history-toggle"
              onClick={() => setShowHistory((s) => !s)}
              className="flex h-10 w-10 items-center justify-center rounded-card bg-card-bg text-text-muted shadow-card hover:bg-control-hover"
            >
              <History size={18} />
            </button>
          </div>

          {showHistory && (
            <div
              data-testid="history-panel"
              className="absolute right-0 top-16 z-10 h-[calc(100%-4rem)] w-72 border-l border-t border-card-border bg-card-bg"
            >
              <HistoryPanel workflowId={id} refreshKey={historyRefreshKey} onClose={() => setShowHistory(false)} />
            </div>
          )}
        </div>
      </div>
    </RunControllerProvider>
  );
}
