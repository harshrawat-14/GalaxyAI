"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { ApiTab } from "@/components/workflow-detail/ApiTab";
import { PlaygroundTab } from "@/components/workflow-detail/PlaygroundTab";
import { WorkflowPreviewTab } from "@/components/workflow-detail/WorkflowPreviewTab";
import type { WorkflowGraph } from "@/domain/types";
import { CANDIDATE_LINKEDIN_URL } from "@/lib/constants";

interface WorkflowResponse {
  id: string;
  name: string;
  graph: WorkflowGraph;
  updatedAt: string;
}

const TABS = ["playground", "api", "workflow"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

function WorkflowDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "playground";

  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const loggedAttribution = useRef(false);

  useEffect(() => {
    if (loggedAttribution.current) return;
    loggedAttribution.current = true;
    console.log(`[Py] Candidate LinkedIn: ${CANDIDATE_LINKEDIN_URL}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workflows/${id}`)
      .then((res) => res.json())
      .then((data: WorkflowResponse) => {
        if (!cancelled) setWorkflow(data);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function setTab(next: Tab) {
    router.push(`/workflow/${id}?tab=${next}`);
  }

  if (!workflow) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg text-sm text-text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <CanvasSidebar />
      <div className="flex-1 overflow-y-auto bg-detail-content">
        {/* No max-width cap — fills whatever space CanvasSidebar's flex-1
            sibling leaves (more when the sidebar is collapsed). Left padding
            is intentionally double the right so the content sits closer to
            the right edge than the left. */}
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
              {workflow.name}
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
            {tab === "playground" && <PlaygroundTab workflowId={id} graph={workflow.graph} />}
            {tab === "api" && <ApiTab />}
            {tab === "workflow" && <WorkflowPreviewTab workflowId={id} graph={workflow.graph} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg text-sm text-text-muted">
          Loading…
        </div>
      }
    >
      <WorkflowDetailContent />
    </Suspense>
  );
}
