'use client'

import { type ReactNode, memo, useCallback } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Play, Trash2, Copy, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflowStore } from '@/store/workflow-store'
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution'

interface BaseNodeProps {
  id: string
  isRunning: boolean
  isSelected?: boolean
  children: ReactNode
  className?: string
  minWidth?: number
  minHeight?: number
  headerColor?: string
  icon?: ReactNode
  title: string
}

export const BaseNode = memo(function BaseNode({
  id,
  isRunning,
  isSelected,
  children,
  className,
  minWidth = 180,
  minHeight = 120,
  headerColor = '#8b5cf6',
  icon,
  title,
}: BaseNodeProps) {
  const deleteNode = useWorkflowStore((s) => s.deleteNode)
  const addNode = useWorkflowStore((s) => s.addNode)
  const nodes = useWorkflowStore((s) => s.nodes)
  const { executeWorkflow } = useWorkflowExecution()

  const handleRunNode = useCallback(() => {
    void executeWorkflow('SINGLE', [id])
  }, [executeWorkflow, id])

  const handleDuplicate = useCallback(() => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    addNode(node.data.type, {
      x: node.position.x + 40,
      y: node.position.y + 40,
    })
  }, [id, nodes, addNode])

  const handleDelete = useCallback(() => {
    deleteNode(id)
  }, [deleteNode, id])

  return (
    <DropdownMenu.Root>
      <div
        className={cn(
          'relative rounded-2xl border bg-panel overflow-hidden',
          'transition-all duration-200',
          isSelected
            ? 'border-accent/60 shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_8px_32px_rgba(0,0,0,0.6)]'
            : 'border-border shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
          isRunning && 'animate-glow-pulse border-accent/80',
          className,
        )}
        style={{ minWidth, minHeight }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top accent strip */}
        <div className="h-[3px] w-full" style={{ background: headerColor }} />

        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/60"
          style={{ background: `${headerColor}0d` }}
        >
          {icon && (
            <span className="flex-shrink-0" style={{ color: headerColor }}>
              {icon}
            </span>
          )}
          <span className="text-[11px] font-semibold text-text/80 tracking-wide truncate flex-1">
            {title}
          </span>

          {isRunning && (
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          )}

          <DropdownMenu.Trigger asChild>
            <button
              className="p-1 rounded-md text-textmuted hover:text-text hover:bg-white/5
                transition-colors nodrag flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
              aria-label="Node menu"
            >
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenu.Trigger>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-2.5 animate-fade-in">{children}</div>
      </div>

      {/* Context menu */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[148px] rounded-xl border border-border bg-panel py-1.5
            shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fade-in"
          sideOffset={4}
          align="start"
        >
          <DropdownMenu.Item
            onSelect={handleRunNode}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-text hover:bg-surface
              hover:text-accent cursor-pointer outline-none transition-colors rounded-md mx-1"
          >
            <Play size={11} className="fill-current flex-shrink-0" />
            Run this node
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border mx-1" />

          <DropdownMenu.Item
            onSelect={handleDuplicate}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-text hover:bg-surface
              cursor-pointer outline-none transition-colors rounded-md mx-1"
          >
            <Copy size={11} className="flex-shrink-0" />
            Duplicate
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={handleDelete}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-error hover:bg-error/10
              cursor-pointer outline-none transition-colors rounded-md mx-1"
          >
            <Trash2 size={11} className="flex-shrink-0" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
})
