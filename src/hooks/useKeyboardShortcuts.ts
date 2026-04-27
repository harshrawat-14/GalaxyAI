'use client'

import { useEffect } from 'react'
import { useWorkflowStore, useTemporalStore } from '@/store/workflow-store'

export function useKeyboardShortcuts() {
  const undo = useTemporalStore((s) => s.undo)
  const redo = useTemporalStore((s) => s.redo)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if (mod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
      }
      if (mod && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      if (mod && e.key === 's') {
        e.preventDefault()
        const { workflowId, workflowName, nodes, edges, viewport, markClean } =
          useWorkflowStore.getState()
        if (!workflowId) return

        void fetch(`/api/workflow/${workflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflowName,
            nodes,
            edges,
            viewport,
          }),
        }).then((res) => {
          if (res.ok) markClean()
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])
}
