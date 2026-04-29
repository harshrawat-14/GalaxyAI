'use client'

import { useState, useEffect } from 'react'
import {
  History,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { WorkflowRun, NodeRunResult } from '@/types/workflow'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  SUCCESS: {
    color: 'text-success',
    bg: 'bg-success/10',
    icon: CheckCircle2,
    label: 'Success',
  },
  FAILED: {
    color: 'text-error',
    bg: 'bg-error/10',
    icon: XCircle,
    label: 'Failed',
  },
  RUNNING: {
    color: 'text-accent',
    bg: 'bg-accent/10',
    icon: Loader2,
    label: 'Running',
  },
  PARTIAL: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    icon: Clock,
    label: 'Partial',
  },
  PENDING: {
    color: 'text-textmuted',
    bg: 'bg-surface',
    icon: Clock,
    label: 'Pending',
  },
} as const

interface Props {
  workflowId: string | null
}

export function RightSidebar({ workflowId }: Props) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const toggleRun = (id: string) => {
    setExpandedRunIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    setRuns([])
    setIsLoading(false)
    if (!workflowId) return

    let aborted = false

    async function fetchRuns() {
      if (aborted) return
      try {
        const res = await fetch(`/api/workflow/${workflowId}/runs`)
        if (res.ok && !aborted) {
          setRuns((await res.json()) as WorkflowRun[])
          setIsLoading(false)
        }
      } catch {
        // silent — SSE will trigger retry when next run completes
      }
    }

    setIsLoading(true)
    void fetchRuns()

    // Subscribe to server-sent events — refetch once when a run finishes
    const es = new EventSource(`/api/workflow/${workflowId}/events`)
    es.addEventListener('run:complete', () => void fetchRuns())

    return () => {
      aborted = true
      es.close()
    }
  }, [workflowId])

  return (
    <div className="w-72 flex flex-col bg-panel border-l border-border flex-shrink-0 animate-slide-in-right">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <History size={14} className="text-textmuted" />
        <h2 className="text-xs font-semibold text-textmuted uppercase tracking-wider">
          Workflow History
        </h2>
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && runs.length === 0 && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <RunSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && runs.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-surface border border-border flex items-center justify-center">
              <History size={16} className="text-textsub" />
            </div>
            <p className="text-xs text-textsub">
              No runs yet. Execute the workflow to see history.
            </p>
          </div>
        )}

        <div className="divide-y divide-border">
          {runs.map((run, index) => {
            const statusCfg = STATUS_CONFIG[run.status]
            const StatusIcon = statusCfg.icon
            const isExpanded = expandedRunIds.has(run.id)

            return (
              <div key={run.id}>
                <button
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-surface transition-colors text-left"
                  onClick={() => toggleRun(run.id)}
                >
                  <StatusIcon
                    size={14}
                    className={cn(
                      'mt-0.5 flex-shrink-0',
                      statusCfg.color,
                      run.status === 'RUNNING' && 'animate-spin',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text">
                        Run #{runs.length - index}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          statusCfg.bg,
                          statusCfg.color,
                        )}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-textsub mt-0.5">
                      {formatDistanceToNow(new Date(run.startedAt), {
                        addSuffix: true,
                      })}
                      {run.durationMs != null &&
                        ` · ${(run.durationMs / 1000).toFixed(1)}s`}
                    </p>
                    <p className="text-[10px] text-textsub">
                      {run.scope === 'FULL'
                        ? 'Full Workflow'
                        : run.scope === 'SINGLE'
                          ? 'Single Node'
                          : `${run.selectedNodeIds.length} nodes selected`}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown
                      size={12}
                      className="text-textmuted mt-0.5"
                    />
                  ) : (
                    <ChevronRight
                      size={12}
                      className="text-textmuted mt-0.5"
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-1.5 bg-surface/50">
                    {run.nodeRuns.map((nodeRun) => (
                      <NodeRunRow key={nodeRun.id} nodeRun={nodeRun} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NodeRunRow({ nodeRun }: { nodeRun: NodeRunResult }) {
  const cfg = STATUS_CONFIG[nodeRun.status]
  const Icon = cfg.icon
  const [errorExpanded, setErrorExpanded] = useState(false)
  const [outputExpanded, setOutputExpanded] = useState(false)

  const outputStr = nodeRun.outputs
    ? JSON.stringify(nodeRun.outputs, null, 2)
    : null
  const isLongOutput = outputStr != null && outputStr.length > 80
  const isLongError = nodeRun.error != null && nodeRun.error.length > 80

  return (
    <div className="flex items-start gap-2 pl-3 border-l-2 border-border py-1">
      <Icon
        size={11}
        className={cn(
          'mt-0.5 flex-shrink-0',
          cfg.color,
          nodeRun.status === 'RUNNING' && 'animate-spin',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-text truncate">
          {nodeRun.nodeLabel}
        </p>
        {nodeRun.durationMs != null && (
          <p className="text-[10px] text-textsub">
            {(nodeRun.durationMs / 1000).toFixed(2)}s
          </p>
        )}
        {outputStr && (
          <div className="text-[10px] text-textsub">
            {outputExpanded ? (
              <pre className="whitespace-pre-wrap break-all max-h-48 overflow-y-auto nowheel font-mono">
                {outputStr}
              </pre>
            ) : (
              <p className="truncate">
                Output: {outputStr.slice(0, 60)}
                {isLongOutput && '…'}
              </p>
            )}
            {isLongOutput && (
              <button
                onClick={() => setOutputExpanded((v) => !v)}
                className="text-accent hover:underline mt-0.5"
              >
                {outputExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
        {nodeRun.error && (
          <div className="text-[10px] text-error">
            {errorExpanded ? (
              <pre className="whitespace-pre-wrap break-all max-h-48 overflow-y-auto nowheel font-mono">
                {nodeRun.error}
              </pre>
            ) : (
              <p className="truncate">{nodeRun.error}</p>
            )}
            {isLongError && (
              <button
                onClick={() => setErrorExpanded((v) => !v)}
                className="text-error/80 hover:text-error hover:underline mt-0.5"
              >
                {errorExpanded ? 'Show less' : 'Show full error'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RunSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border border-border rounded-lg animate-pulse">
      <div className="w-3.5 h-3.5 rounded-full bg-surface mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-2.5 bg-surface rounded w-16" />
          <div className="h-4 bg-surface rounded-full w-12" />
        </div>
        <div className="h-2 bg-surface rounded w-28" />
        <div className="h-2 bg-surface rounded w-20" />
      </div>
    </div>
  )
}
