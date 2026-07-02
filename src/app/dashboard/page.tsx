"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Upload, Workflow as WorkflowIcon } from "lucide-react";
import { validateGraph } from "@/domain/dag";
import { workflowGraphSchema } from "@/domain/schema";
import type { WorkflowGraph } from "@/domain/types";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { WorkflowCard, type WorkflowSummary } from "@/components/dashboard/WorkflowCard";
import { CANDIDATE_LINKEDIN_URL } from "@/lib/constants";
import { SYSTEM_WORKFLOWS } from "@/lib/systemWorkflows";

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const loggedAttribution = useRef(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loggedAttribution.current) return;
    loggedAttribution.current = true;
    console.log(`[Py] Candidate LinkedIn: ${CANDIDATE_LINKEDIN_URL}`);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/workflows");
    setWorkflows(await res.json());
    setLoading(false);
  }

  async function createWorkflow() {
    const res = await fetch("/api/workflows", { method: "POST" });
    const { id } = await res.json();
    router.push(`/workflow/${id}/edit`);
  }

  async function renameWorkflow(id: string, name: string) {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function deleteWorkflow(id: string) {
    if (!window.confirm("Delete this workflow? This cannot be undone.")) return;
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
  }

  async function setCoverImage(id: string, coverImageUrl: string) {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, coverImageUrl } : w)));
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverImageUrl }),
    });
  }

  // Composes the existing create (POST) + update (PATCH) endpoints — there's
  // no dedicated "duplicate workflow" endpoint, so this fetches the source's
  // full graph, creates a new workflow, then writes that graph onto it.
  async function duplicateWorkflow(id: string) {
    const source = await (await fetch(`/api/workflows/${id}`)).json();
    const created = await (
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${source.name} Copy` }),
      })
    ).json();
    await fetch(`/api/workflows/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph: source.graph, coverImageUrl: source.coverImageUrl }),
    });
    await refresh();
  }

  async function exportWorkflowJson(id: string) {
    const workflow = await (await fetch(`/api/workflows/${id}`)).json();
    const blob = new Blob([JSON.stringify(workflow.graph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Same validation the editor's own import uses (NodePicker.tsx) — never
  // trust a client-supplied graph without re-checking DAG/connection rules.
  async function importWorkflow(file: File) {
    let parsed: WorkflowGraph;
    try {
      parsed = workflowGraphSchema.parse(JSON.parse(await file.text())) as WorkflowGraph;
    } catch {
      window.alert("That file isn't a valid workflow JSON export.");
      return;
    }
    const validation = validateGraph(parsed);
    if (!validation.ok) {
      window.alert(`Invalid workflow file: ${validation.reason}`);
      return;
    }

    const created = await (await fetch("/api/workflows", { method: "POST" })).json();
    await fetch(`/api/workflows/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph: parsed }),
    });
    router.push(`/workflow/${created.id}/edit`);
  }

  const filtered = useMemo(
    () => workflows.filter((w) => w.name.toLowerCase().includes(query.trim().toLowerCase())),
    [workflows, query],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-bg">
      <CanvasSidebar />

      <div data-testid="dashboard-root" className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-text-strong">Flow</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="import-workflow"
              onClick={() => importInputRef.current?.click()}
              className="flex h-11 items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
            >
              <Upload size={16} /> Import
            </button>
            <input
              ref={importInputRef}
              data-testid="import-workflow-input"
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) importWorkflow(file);
              }}
            />
            <button
              type="button"
              aria-label="New workflow"
              data-testid="create-workflow"
              onClick={createWorkflow}
              className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#565656] text-white hover:bg-[#4A4A4A]"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-base font-semibold text-text-strong">System Workflows</h2>
          <p className="mb-3 text-sm text-label-muted">Prebuilt workflow templates - click to preview, then clone to use.</p>
          {/* 1.5x the "Your workflows" grid's per-card width at each
              breakpoint (50%/25% there -> 75%/37.5% here) via flex-wrap
              instead of its own grid, since CSS Grid can't express a
              fractional (non-integer) column count. Height is literally
              1.5 * the regular thumbnail's 112px (h-28). */}
          <div className="flex flex-wrap gap-4" data-testid="system-workflow-list">
            {SYSTEM_WORKFLOWS.map((template) => (
              <button
                key={template.id}
                type="button"
                data-testid="system-workflow-card"
                onClick={() => router.push(`/templates/${template.id}`)}
                className="w-full overflow-hidden rounded-card border border-card-border bg-card-bg text-left shadow-card sm:w-[75%] lg:w-[37.5%]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static public/ asset, not worth next/image config here */}
                <img src={template.coverImageUrl} alt="" className="h-[168px] w-full bg-canvas-bg object-cover" />
                <p className="px-3 py-2.5 text-sm text-text-strong">{template.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-text-strong">Your workflows</h2>
          <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2">
            <Search size={14} className="text-label-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows..."
              data-testid="workflow-search"
              className="w-40 bg-transparent text-sm text-text-strong placeholder:text-label-muted focus:outline-none"
            />
          </div>
        </div>
        <p className="mb-3 text-sm text-label-muted">Open one to edit, run, and review history.</p>

        {loading && <p className="text-sm text-text-muted">Loading…</p>}

        {!loading && workflows.length === 0 && (
          <div data-testid="dashboard-empty" className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-card-border py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <WorkflowIcon size={22} />
            </div>
            <p className="text-sm font-medium text-text-muted">No workflows yet</p>
            <p className="text-sm text-label-muted">Create your first workflow to start building.</p>
            <button
              type="button"
              onClick={createWorkflow}
              className="mt-1 flex items-center gap-1 rounded-run bg-run px-3 py-2 text-sm font-medium text-white hover:bg-run-hover"
            >
              <Plus size={14} /> New workflow
            </button>
          </div>
        )}

        {!loading && workflows.length > 0 && (
          <div data-testid="workflow-list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onRename={renameWorkflow}
                onDelete={deleteWorkflow}
                onDuplicate={duplicateWorkflow}
                onExport={exportWorkflowJson}
                onCoverImageChange={setCoverImage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
