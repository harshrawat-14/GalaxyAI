"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { ApiTab } from "@/components/workflow-detail/ApiTab";
import { WorkflowPreviewTab } from "@/components/workflow-detail/WorkflowPreviewTab";
import { CANDIDATE_LINKEDIN_URL } from "@/lib/constants";
import { getSystemWorkflow } from "@/lib/systemWorkflows";

const TABS = ["playground", "api", "workflow"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

/**
 * Read-only preview of a system-workflow template (src/lib/systemWorkflows.ts)
 * — visiting this page never creates anything. It mirrors /workflow/[id]'s
 * tab layout so a template "feels like" a normal workflow, except Playground
 * has nothing to run against (no real workflow row exists yet) and the
 * Workflow tab's button clones into a real, user-owned workflow instead of
 * opening an editor that doesn't exist for a template.
 */
function TemplateDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "playground";
  const [cloning, setCloning] = useState(false);
  const loggedAttribution = useRef(false);

  useEffect(() => {
    if (loggedAttribution.current) return;
    loggedAttribution.current = true;
    console.log(`[Py] Candidate LinkedIn: ${CANDIDATE_LINKEDIN_URL}`);
  }, []);

  const template = useMemo(() => getSystemWorkflow(id), [id]);
  const graph = useMemo(() => template?.buildGraph(), [template]);

  async function cloneTemplate() {
    if (!template || !graph || cloning) return;
    setCloning(true);
    const created = await (
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: template.name }),
      })
    ).json();
    await fetch(`/api/workflows/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph, coverImageUrl: template.coverImageUrl }),
    });
    router.push(`/workflow/${created.id}/edit`);
  }

  function setTab(next: Tab) {
    router.push(`/templates/${id}?tab=${next}`);
  }

  if (!template || !graph) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg text-sm text-text-muted">
        Template not found.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <CanvasSidebar />
      <div className="flex-1 overflow-y-auto bg-detail-content">
        <div className="py-8 pl-16 pr-8">
          <div className="flex items-center gap-3 bg-detail-content">
            <button
              type="button"
              aria-label="Back to dashboard"
              data-testid="detail-back-button"
              onClick={() => router.push("/dashboard")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-card-border bg-detail-back shadow-card hover:bg-control-hover"
            >
              <ArrowLeft size={20} className="text-text-muted" />
            </button>
            <h1 data-testid="detail-workflow-name" className="truncate text-2xl font-bold text-text-strong">
              {template.name}
            </h1>
          </div>

          <div className="mt-6 flex gap-6 border-b border-divider bg-detail-content">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`detail-tab-${t}`}
                onClick={() => setTab(t)}
                className={`pb-3 text-[16px] font-medium ${
                  tab === t ? "border-b-2 border-text-strong text-text-strong" : "text-text-muted hover:text-text-strong"
                }`}
              >
                {t === "api" ? "API" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="mt-6 bg-detail-content">
            {tab === "playground" && (
              <div
                data-testid="template-playground-placeholder"
                className="flex min-h-[calc(100vh-220px)] flex-col items-center justify-center gap-2 rounded-card border border-card-border bg-detail-card p-6 text-center shadow-card"
              >
                <p className="text-[18px] text-text-muted">This is a template preview.</p>
                <p className="text-sm text-label-muted">Clone it from the Workflow tab to run it from Playground.</p>
              </div>
            )}
            {tab === "api" && <ApiTab />}
            {tab === "workflow" && (
              <WorkflowPreviewTab workflowId={template.id} graph={graph} onClone={cloneTemplate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplateDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg text-sm text-text-muted">
          Loading…
        </div>
      }
    >
      <TemplateDetailContent />
    </Suspense>
  );
}
