'use client'

import { forwardRef, useCallback, useRef, useState } from 'react'
import {
  Play,
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  Zap,
  StopCircle,
  Loader2,
  Trash2,
  Square,
} from 'lucide-react'
import Link from 'next/link'
import { useWorkflowStore, useTemporalStore } from '@/store/workflow-store'
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution'
import { Tooltip } from '@/components/ui/Tooltip'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CanvasToolbar() {
  const workflowName = useWorkflowStore((s) => s?.workflowName ?? 'Untitled Workflow')
  const isDirty = useWorkflowStore((s) => s?.isDirty ?? false)
  const selectedNodeIds = useWorkflowStore((s) => s?.selectedNodeIds ?? new Set<string>())
  const isExecuting = useWorkflowStore((s) => s?.isExecuting ?? false)
  const { executeWorkflow, cancelExecution } = useWorkflowExecution()
  const [isSaving, setIsSaving] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const undo = useTemporalStore((s) => s.undo)
  const redo = useTemporalStore((s) => s.redo)
  const pastStates = useTemporalStore((s) => s.pastStates)
  const futureStates = useTemporalStore((s) => s.futureStates)

  const handleSave = useCallback(async () => {
    const { nodes, edges, viewport, workflowId, workflowName: name, markClean, setWorkflowId } =
      useWorkflowStore.getState()
    const method = workflowId ? 'PUT' : 'POST'
    const url = workflowId ? `/api/workflow/${workflowId}` : '/api/workflow'

    setIsSaving(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodes, edges, viewport }),
      })

      if (res.ok) {
        if (!workflowId) {
          const data = (await res.json()) as { id: string }
          setWorkflowId(data.id)
        }
        markClean()
        toast.success('Workflow saved')
      } else {
        const text = await res.text()
        toast.error(`Save failed: ${text || res.statusText}`)
      }
    } catch {
      toast.error('Save failed — check your connection')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const handleClearCanvas = useCallback(() => {
    const { setNodes, setEdges } = useWorkflowStore.getState()
    setNodes([])
    setEdges([])
    toast.success('Canvas cleared')
  }, [])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string) as {
          name?: string
          nodes?: unknown[]
          edges?: unknown[]
        }
        const { setNodes, setEdges, setWorkflowName, setWorkflowId } =
          useWorkflowStore.getState()
        if (json.name) setWorkflowName(json.name)
        setNodes((json.nodes ?? []) as Parameters<typeof setNodes>[0])
        setEdges((json.edges ?? []) as Parameters<typeof setEdges>[0])
        setWorkflowId(null)
        useWorkflowStore.setState({ isDirty: true })
        toast.success('Workflow imported')
      } catch {
        toast.error('Invalid workflow JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleExport = useCallback(() => {
    const { nodes, edges, workflowName: name } = useWorkflowStore.getState()
    const blob = new Blob(
      [JSON.stringify({ name, nodes, edges }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Workflow exported')
  }, [])

  return (
    <header className="flex items-center gap-2 px-4 h-12 bg-panel border-b border-border flex-shrink-0">
      {/* Logo */}
      <Tooltip content="Back to Dashboard" side="bottom">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 mr-3 hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center">
            <Zap size={12} className="text-white fill-white" />
          </div>
          <span className="text-sm font-semibold text-text hidden sm:block tracking-tight">
            NextFlow
          </span>
        </Link>
      </Tooltip>

      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Workflow name */}
      <input
        value={workflowName}
        onChange={(e) => useWorkflowStore.getState().setWorkflowName(e.target.value)}
        className="bg-transparent text-sm text-text border-none outline-none
          hover:bg-surface focus:bg-surface px-2 py-1 rounded-md transition-colors
          max-w-52 truncate"
      />

      {isDirty && (
        <span className="text-[10px] text-textsub flex-shrink-0">·&nbsp;unsaved</span>
      )}

      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Undo (⌘Z)" side="bottom">
          <ToolbarButton onClick={() => undo()} disabled={pastStates.length === 0}>
            <Undo2 size={14} />
          </ToolbarButton>
        </Tooltip>
        <Tooltip content="Redo (⌘⇧Z)" side="bottom">
          <ToolbarButton onClick={() => redo()} disabled={futureStates.length === 0}>
            <Redo2 size={14} />
          </ToolbarButton>
        </Tooltip>
      </div>

      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Save / Clear / Export / Import */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Save (⌘S)" side="bottom">
          <ToolbarButton onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          </ToolbarButton>
        </Tooltip>
        <Tooltip content="Export JSON" side="bottom">
          <ToolbarButton onClick={handleExport}>
            <Download size={14} />
          </ToolbarButton>
        </Tooltip>
        <Tooltip content="Import JSON" side="bottom">
          <ToolbarButton onClick={() => importInputRef.current?.click()}>
            <Upload size={14} />
          </ToolbarButton>
        </Tooltip>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImport}
        />
        <Tooltip content="Clear canvas" side="bottom">
          <ToolbarButton onClick={handleClearCanvas}>
            <Trash2 size={14} />
          </ToolbarButton>
        </Tooltip>
      </div>

      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Run controls */}
      <div className="flex items-center gap-2">
        {!isExecuting && selectedNodeIds.size > 0 && (
          <Tooltip
            content={`Run ${selectedNodeIds.size} selected node${selectedNodeIds.size > 1 ? 's' : ''}`}
            side="bottom"
          >
            <ToolbarButton
              onClick={() =>
                void executeWorkflow(
                  selectedNodeIds.size === 1 ? 'SINGLE' : 'PARTIAL',
                  [...selectedNodeIds],
                )
              }
              variant="secondary"
            >
              <Square size={12} />
              <span className="text-xs">
                {selectedNodeIds.size} node{selectedNodeIds.size > 1 ? 's' : ''}
              </span>
            </ToolbarButton>
          </Tooltip>
        )}

        {isExecuting ? (
          <ToolbarButton onClick={() => cancelExecution()} variant="danger">
            <StopCircle size={13} className="fill-current" />
            <span className="text-xs font-medium">Stop</span>
          </ToolbarButton>
        ) : (
          <ToolbarButton onClick={() => void executeWorkflow('FULL')} variant="primary">
            <Play size={13} className="fill-current" />
            <span className="text-xs font-medium">Run</span>
          </ToolbarButton>
        )}
      </div>
    </header>
  )
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger'
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ children, variant = 'ghost', className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        {...rest}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variant === 'ghost' && 'text-textmuted hover:text-text hover:bg-surface',
          variant === 'secondary' && 'text-text bg-surface hover:bg-borderhov border border-border',
          variant === 'primary' && 'text-white bg-accent hover:bg-accenthov',
          variant === 'danger' && 'text-white bg-error hover:bg-error/80',
          className,
        )}
      >
        {children}
      </button>
    )
  },
)
