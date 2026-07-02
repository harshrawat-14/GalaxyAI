"use client";

import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { AlignLeft, Hash, Image as ImageIcon, PlayCircle, Search, SquareCheck, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { OutputBox } from "@/components/canvas/controls";
import { nodeDisplayLabel, type RequestField, type RequestInputsConfig } from "@/domain/nodes";
import type { NodeExecutionRecord, NodeStatus, WorkflowGraph, WorkflowRun } from "@/domain/types";
import { estimateGraphTokens, estimateRunCredits, formatM } from "@/lib/estimates";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { resultValue } from "@/lib/resultValue";
import { UnsupportedImageTypeError, uploadImage } from "@/lib/uploadImage";

const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.map((ext) => `.${ext}`).join(",");

const FIELD_TYPE_META: Record<RequestField["type"], { icon: typeof AlignLeft; badge: string }> = {
  text_field: { icon: AlignLeft, badge: "Text" },
  number_field: { icon: Hash, badge: "Number" },
  boolean_field: { icon: SquareCheck, badge: "Boolean" },
  image_field: { icon: ImageIcon, badge: "Image" },
};

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

const RUN_BADGE: Record<WorkflowRun["status"], string> = {
  running: "bg-violet-100 text-violet-700",
  success: "bg-runpill-bg text-runpill-text",
  failed: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
};

interface RunListRow extends Omit<WorkflowRun, "nodeExecutions"> {
  nodeExecutions?: NodeExecutionRecord[];
}

interface RunHandle {
  runId: string;
  tag: string;
  publicToken: string;
}

interface RequestInputsField {
  nodeId: string;
  field: RequestField;
}

// Number/boolean fields exist specifically to be wired into Gemini/Crop
// param ports from the builder canvas (docs/prompts/model-and-crop-nodes.md
// follow-up) — they're not meant for an end user to fill in by hand, so the
// Playground tab only ever shows text_field/image_field rows.
const PLAYGROUND_FIELD_TYPES = new Set<RequestField["type"]>(["text_field", "image_field"]);

function requestInputsFields(graph: WorkflowGraph): RequestInputsField[] {
  const fields: RequestInputsField[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "request-inputs") continue;
    for (const field of (node.config as RequestInputsConfig).fields) {
      if (PLAYGROUND_FIELD_TYPES.has(field.type)) fields.push({ nodeId: node.id, field });
    }
  }
  return fields;
}

function applyInputValues(graph: WorkflowGraph, values: Record<string, string | null>): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.kind !== "request-inputs") return node;
      const config = node.config as RequestInputsConfig;
      return {
        ...node,
        config: {
          ...config,
          fields: config.fields.map((field) =>
            field.id in values ? { ...field, value: values[field.id] } : field,
          ),
        },
      };
    }),
  };
}

/** Self-contained run-trigger + realtime hook for the Playground tab — mirrors
 * RunController.tsx's two-phase start, but writes node outputs into local page
 * state instead of the canvas Zustand store, so playground runs never touch
 * (or mark dirty) the builder's autosaved graph. */
function usePlaygroundRun(workflowId: string, onRunsChanged: () => void) {
  const [active, setActive] = useState<RunHandle | null>(null);
  const [outputs, setOutputs] = useState<Record<string, unknown>>({});
  const [statuses, setStatuses] = useState<Record<string, NodeStatus>>({});
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

  useEffect(() => {
    if (!run?.metadata) return;
    const nextOutputs: Record<string, unknown> = {};
    const nextStatuses: Record<string, NodeStatus> = {};
    for (const [nodeId, value] of Object.entries(run.metadata)) {
      const entry = value as { status?: NodeStatus; output?: unknown };
      if (entry?.status) nextStatuses[nodeId] = entry.status;
      if (entry?.output !== undefined) nextOutputs[nodeId] = entry.output;
    }
    setStatuses((prev) => ({ ...prev, ...nextStatuses }));
    setOutputs((prev) => ({ ...prev, ...nextOutputs }));
  }, [run?.metadata]);

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

  async function startRun(graph: WorkflowGraph) {
    setOutputs({});
    setStatuses({});
    const res = await fetch(`/api/workflows/${workflowId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "full", nodeIds: graph.nodes.map((n) => n.id), graph }),
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

  return { startRun, isRunning: Boolean(active), outputs, statuses };
}

export function PlaygroundTab({ workflowId, graph }: { workflowId: string; graph: WorkflowGraph }) {
  const fields = useMemo(() => requestInputsFields(graph), [graph]);
  const responseNodeId = useMemo(() => graph.nodes.find((n) => n.kind === "response")?.id, [graph]);
  const hasExecutableNodes = graph.nodes.some((n) => n.kind !== "request-inputs");

  const [values, setValues] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(fields.map(({ field }) => [field.id, field.value])),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunListRow[]>([]);
  const [runsTab, setRunsTab] = useState<"ui" | "api">("ui");
  const [search, setSearch] = useState("");

  function refreshRuns() {
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((res) => res.json())
      .then(setRuns);
  }

  useEffect(() => {
    refreshRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per workflow
  }, [workflowId]);

  const { startRun, isRunning, outputs } = usePlaygroundRun(workflowId, refreshRuns);

  const responseOutput = responseNodeId ? (outputs[responseNodeId] as { result?: unknown[] } | undefined) : undefined;
  // One entry per connected source node, in connection order — matches the
  // run engine's `multiple: true` resolution order for the "result" port.
  const responseSources = useMemo(() => {
    if (!responseNodeId) return [];
    return graph.edges
      .filter((e) => e.target === responseNodeId && e.targetHandle === "result")
      .map((edge) => {
        const sourceNode = graph.nodes.find((n) => n.id === edge.source);
        return { key: edge.id, label: sourceNode ? nodeDisplayLabel(sourceNode.kind, sourceNode.config) : "Output" };
      });
  }, [graph, responseNodeId]);

  async function handleImageUpload(fieldId: string, file: File) {
    setUploadError(null);
    setUploading(fieldId);
    try {
      const url = await uploadImage(file);
      setValues((prev) => ({ ...prev, [fieldId]: url }));
    } catch (error) {
      setUploadError(error instanceof UnsupportedImageTypeError ? error.message : "Upload failed — please try again.");
    } finally {
      setUploading(null);
    }
  }

  function handleRun() {
    startRun(applyInputValues(graph, values));
  }

  const filteredRuns = useMemo(
    () => (runsTab === "api" ? [] : runs.filter((r) => r.id.toLowerCase().includes(search.trim().toLowerCase()))),
    [runs, runsTab, search],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-h-[calc(100vh-220px)] flex-col rounded-card border border-card-border bg-detail-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-strong">Inputs</h2>
            <span data-testid="playground-est-pill" className="rounded-lg bg-control-hover px-2 py-1 text-xs text-label-muted">
              Est. {formatM(estimateGraphTokens(graph))}
            </span>
          </div>
          <p className="mt-1 text-sm text-label-muted">Configure the input fields for this workflow run</p>

          <div className="mt-4 space-y-4">
            {fields.map(({ field }) => {
              const Icon = FIELD_TYPE_META[field.type].icon;
              const isOn = values[field.id] === "true";
              return (
                <div key={field.id} data-testid="playground-input-field">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold text-text-strong">
                      <Icon size={14} className="text-label-muted" />
                      {field.name}
                    </span>
                    <span className="text-[13px] text-label-muted">{FIELD_TYPE_META[field.type].badge}</span>
                  </div>

                  {field.type === "text_field" && (
                    <textarea
                      value={values[field.id] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={`Enter ${field.name}…`}
                      data-testid="playground-text-input"
                      className="mt-2 min-h-[120px] w-full resize-y rounded-lg border border-card-border p-2 text-sm text-text-strong placeholder:text-label-muted focus:outline-none"
                    />
                  )}

                  {field.type === "number_field" && (
                    <input
                      type="number"
                      value={values[field.id] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder="Enter number…"
                      data-testid="playground-number-input"
                      className="mt-2 w-full rounded-lg border border-card-border p-2 text-sm text-text-strong placeholder:text-label-muted focus:outline-none"
                    />
                  )}

                  {field.type === "boolean_field" && (
                    <div className="mt-2 flex items-center gap-2.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        data-testid="playground-boolean-toggle"
                        onClick={() => setValues((prev) => ({ ...prev, [field.id]: isOn ? "false" : "true" }))}
                        className={`relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors ${
                          isOn ? "bg-text-strong" : "bg-control-hover"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                            isOn ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-sm text-text-muted">{isOn ? "true" : "false"}</span>
                    </div>
                  )}

                  {field.type === "image_field" && (
                    <div className="mt-2 flex items-center gap-2">
                      {values[field.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN thumbnail
                        <img
                          src={values[field.id] as string}
                          alt={field.name}
                          data-testid="playground-image-preview"
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <label className="flex cursor-pointer items-center gap-1 rounded bg-canvas-bg px-2 py-1.5 text-xs text-text-muted hover:bg-control-hover">
                          <Upload size={12} />
                          {uploading === field.id ? "Uploading…" : "Upload"}
                          <input
                            type="file"
                            accept={ACCEPT_ATTR}
                            data-testid="playground-image-input"
                            className="hidden"
                            disabled={uploading === field.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) handleImageUpload(field.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {fields.length === 0 && <p className="text-sm text-label-muted">This workflow has no input fields.</p>}
          </div>

          {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}

          <button
            type="button"
            data-testid="playground-run-button"
            disabled={isRunning || !hasExecutableNodes}
            onClick={handleRun}
            className="mt-auto flex h-[52px] w-full items-center justify-center gap-2 rounded-card bg-run text-[16px] font-semibold text-white hover:bg-run-hover disabled:opacity-50"
          >
            <PlayCircle size={18} />
            {isRunning ? "Running…" : "Run"}
          </button>
        </div>

        <div className="flex min-h-[calc(100vh-220px)] flex-col rounded-card border border-card-border bg-detail-card p-6 shadow-card">
          <h2 className="text-xl font-bold text-text-strong">Output</h2>
          <p className="mt-1 text-sm text-label-muted">Results from workflow execution</p>

          {responseSources.length > 0 ? (
            <div data-testid="playground-output" className="mt-4 flex-1 space-y-4 overflow-y-auto">
              {responseSources.map((source, i) => (
                <div key={source.key} className="space-y-1">
                  <span className="text-[15px] font-semibold text-text-strong">{source.label}</span>
                  <OutputBox>{resultValue(responseOutput?.result?.[i])}</OutputBox>
                </div>
              ))}
            </div>
          ) : (
            <div data-testid="playground-output" className="mt-4 flex flex-1 items-center justify-center rounded-lg bg-detail-content p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <PlayCircle size={64} className="text-zinc-300" strokeWidth={1} />
                <p className="text-[18px] text-text-muted">No output yet</p>
                <p className="text-sm text-zinc-400">Run the workflow to see results here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-card border border-card-border bg-detail-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-strong">Run History ({runs.length})</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-control-hover p-1 text-xs">
              <button
                type="button"
                data-testid="run-history-ui-toggle"
                onClick={() => setRunsTab("ui")}
                className={`rounded-md px-2.5 py-1 font-medium ${runsTab === "ui" ? "bg-detail-card text-text-strong shadow-card" : "text-text-muted"}`}
              >
                UI Runs
              </button>
              <button
                type="button"
                data-testid="run-history-api-toggle"
                onClick={() => setRunsTab("api")}
                className={`rounded-md px-2.5 py-1 font-medium ${runsTab === "api" ? "bg-detail-card text-text-strong shadow-card" : "text-text-muted"}`}
              >
                API Runs
              </button>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-card-border px-2.5 py-1.5">
              <Search size={14} className="text-label-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Run ID…"
                data-testid="run-history-search"
                className="w-[200px] bg-transparent text-sm text-text-strong placeholder:text-label-muted focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-[13px] font-medium text-label-muted">
          <span>Date &amp; Time</span>
          <span>Status</span>
          <span>Used credits</span>
          <span>Run ID</span>
        </div>

        <div className="mt-2 divide-y divide-divider">
          {runsTab === "api" && <p className="py-6 text-center text-sm text-label-muted">No API runs yet.</p>}
          {runsTab === "ui" && filteredRuns.length === 0 && <p className="py-6 text-center text-sm text-label-muted">No UI run yet.</p>}
          {runsTab === "ui" &&
            filteredRuns.map((run) => (
              <div key={run.id} data-testid="run-history-row" className="grid grid-cols-4 items-center gap-2 py-2 text-sm">
                <span className="text-text-muted">{new Date(run.startedAt).toLocaleString()}</span>
                <span className={`w-fit rounded px-1.5 py-0.5 text-xs font-medium ${RUN_BADGE[run.status]}`}>{run.status}</span>
                <span className="text-text-muted">{formatM(estimateRunCredits({ nodeExecutions: run.nodeExecutions ?? [] }))}</span>
                <span className="truncate font-mono text-xs text-label-muted" title={run.id}>{run.id}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
