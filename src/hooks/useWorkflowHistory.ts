'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WorkflowRun } from '@/types/workflow'

export function useWorkflowHistory(workflowId: string | null) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/workflow/${workflowId}/runs`)
      if (res.ok) {
        const data = (await res.json()) as WorkflowRun[]
        setRuns(data)
      }
    } catch {
      // Silently handle — will retry
    } finally {
      setIsLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    void fetchRuns()
    const interval = setInterval(() => void fetchRuns(), 3000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  return { runs, isLoading, refetch: fetchRuns }
}
