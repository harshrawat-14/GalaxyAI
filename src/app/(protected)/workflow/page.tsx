'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas'
import { LeftSidebar } from '@/components/sidebar/LeftSidebar'
import { RightSidebar } from '@/components/sidebar/RightSidebar'
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar'
import { WorkflowStoreHydration } from '@/components/providers/WorkflowStoreHydration'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useWorkflowStore } from '@/store/workflow-store'
import { Toaster } from 'sonner'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FlowNode, FlowEdge } from '@/types/workflow'

function WorkflowLoader() {
  const searchParams = useSearchParams()
  const workflowIdFromUrl = searchParams.get('id')
  const sampleParam = searchParams.get('sample')
  const starterParam = searchParams.get('starter')
  const workflowId = useWorkflowStore((s) => s?.workflowId ?? null)
  const loadWorkflow = useWorkflowStore((s) => s?.loadWorkflow)
  const resetWorkflow = useWorkflowStore((s) => s?.resetWorkflow)

  useEffect(() => {
    if (workflowIdFromUrl) {
      if (workflowIdFromUrl !== workflowId) {
        fetch(`/api/workflow/${workflowIdFromUrl}`)
          .then((r) => r.json())
          .then((data: { id: string; name: string; nodes: FlowNode[]; edges: FlowEdge[]; viewport?: { x: number; y: number; zoom: number } }) => {
            loadWorkflow?.({
              id: data.id,
              name: data.name,
              nodes: data.nodes,
              edges: data.edges,
              viewport: data.viewport,
            })
          })
          .catch(() => {/* fallback: start blank */})
      }
    } else if (sampleParam) {
      // Load a sample template into a fresh (unsaved) canvas
      import('@/lib/sample-workflow').then(({ IMAGE_ANALYZER_WORKFLOW, VIDEO_FRAME_WORKFLOW, SAMPLE_WORKFLOW }) => {
        const samples: Record<string, { name?: string; nodes: FlowNode[]; edges: FlowEdge[] }> = {
          'image-analyzer': IMAGE_ANALYZER_WORKFLOW,
          'video-frame': VIDEO_FRAME_WORKFLOW,
          'product-kit': { name: 'Product Marketing Kit', ...SAMPLE_WORKFLOW },
        }
        const sample = samples[sampleParam]
        if (sample) {
          loadWorkflow?.({
            id: null,
            name: sample.name ?? 'Sample Workflow',
            nodes: sample.nodes,
            edges: sample.edges,
          })
        } else {
          resetWorkflow?.()
        }
      }).catch(() => resetWorkflow?.())
    } else if (starterParam) {
      // Load a per-node starter mini-template
      import('@/lib/sample-workflow').then(({ STARTER_TEMPLATES }) => {
        const starter = STARTER_TEMPLATES[starterParam]
        if (starter) {
          loadWorkflow?.({
            id: null,
            name: starter.name,
            nodes: starter.nodes,
            edges: starter.edges,
          })
        } else {
          resetWorkflow?.()
        }
      }).catch(() => resetWorkflow?.())
    } else {
      resetWorkflow?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowIdFromUrl, sampleParam, starterParam])

  return null
}

function WorkflowContent() {
  const workflowId = useWorkflowStore((s) => s?.workflowId ?? null)

  useAutoSave()
  useKeyboardShortcuts()

  return (
    <div className="flex flex-col h-screen bg-canvas overflow-hidden">
      <CanvasToolbar />
      <div className="flex flex-1 overflow-hidden relative">
        <LeftSidebar />
        <WorkflowCanvas />
        <RightSidebar workflowId={workflowId} />
      </div>
    </div>
  )
}

export default function WorkflowPage() {
  return (
    <WorkflowStoreHydration>
      <ReactFlowProvider>
        <Suspense fallback={null}>
          <WorkflowLoader />
        </Suspense>
        <WorkflowContent />
      </ReactFlowProvider>
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#161616',
            border: '1px solid #222222',
            color: '#e5e5e5',
          },
        }}
      />
    </WorkflowStoreHydration>
  )
}
