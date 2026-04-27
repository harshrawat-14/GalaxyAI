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
import { SAMPLE_WORKFLOW } from '@/lib/sample-workflow'
import { Toaster } from 'sonner'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { FlowNode, FlowEdge } from '@/types/workflow'

function WorkflowLoader() {
  const searchParams = useSearchParams()
  const workflowIdFromUrl = searchParams.get('id')
  const workflowId = useWorkflowStore((s) => s?.workflowId ?? null)
  const loadWorkflow = useWorkflowStore((s) => s?.loadWorkflow)
  const resetWorkflow = useWorkflowStore((s) => s?.resetWorkflow)
  const setNodes = useWorkflowStore((s) => s?.setNodes)
  const setEdges = useWorkflowStore((s) => s?.setEdges)

  useEffect(() => {
    if (workflowIdFromUrl) {
      // Loading an existing workflow by URL id — only refetch if it's a different one
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
    } else {
      // No ?id — this is a "New Workflow" navigation. Always start fresh, even
      // if the store still holds a previously-edited workflow. Otherwise the
      // first save would PUT-update that old workflow instead of creating one.
      resetWorkflow?.()
      setNodes?.(SAMPLE_WORKFLOW.nodes)
      setEdges?.(SAMPLE_WORKFLOW.edges)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowIdFromUrl])

  return null
}

function WorkflowContent() {
  const workflowId = useWorkflowStore((s) => s?.workflowId ?? null)

  useAutoSave()
  useKeyboardShortcuts()

  return (
    <div className="flex flex-col h-screen bg-canvas overflow-hidden">
      <CanvasToolbar />
      <div className="flex flex-1 overflow-hidden">
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
