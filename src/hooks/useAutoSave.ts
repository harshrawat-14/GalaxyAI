'use client'

import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'

const AUTOSAVE_DELAY = 2000

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = useWorkflowStore.subscribe(
      (state, prevState) => {
        if (state.isDirty && !prevState?.isDirty) {
          // isDirty just became true
        }
        if (!state?.isDirty) return

        if (timerRef.current) clearTimeout(timerRef.current)

        timerRef.current = setTimeout(() => {
          const {
            nodes,
            edges,
            viewport,
            workflowId,
            workflowName,
            markClean,
          } = useWorkflowStore.getState()
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
        }, AUTOSAVE_DELAY)
      },
    )

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}
