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
  minWidth = 280,
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
          'relative rounded-xl border bg-panel overflow-hidden',
          'transition-all duration-200',
          'border-border',
          isSelected && 'border-accent ring-1 ring-accent/30',
          isRunning && 'animate-glow-pulse border-accent',
          className,
        )}
        style={{
          minWidth,
          minHeight,
          boxShadow: isRunning
            ? '0 0 20px 4px #8b5cf650'
            : isSelected
              ? '0 0 0 1px #8b5cf640'
              : '0 4px 24px #00000060',
        }}
        onContextMenu={(e) => {
          e.preventDefault()
        }}
      >
        {/* Top color strip */}
        <div className="h-0.5 w-full" style={{ background: headerColor }} />

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border group">
          {icon && (
            <span className="text-textmuted" style={{ color: headerColor }}>
              {icon}
            </span>
          )}
          <span className="text-[10px] font-medium text-textmuted uppercase tracking-wider truncate flex-1">
            {title}
          </span>
          {isRunning && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
          )}

          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                'p-1 rounded text-text hover:bg-surface transition-colors nodrag',
                'opacity-70 hover:opacity-100',
              )}
              onClick={(e) => e.stopPropagation()}
              aria-label="Node menu"
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenu.Trigger>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2 animate-fade-in">{children}</div>
      </div>

      {/* Dropdown menu portal */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[140px] rounded-lg border border-border bg-panel py-1 shadow-xl
            animate-fade-in"
          sideOffset={4}
          align="start"
        >
          <DropdownMenu.Item
            onSelect={handleRunNode}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface
              hover:text-accent cursor-pointer outline-none transition-colors"
          >
            <Play size={11} className="fill-current" />
            Run this node
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={handleDuplicate}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface
              cursor-pointer outline-none transition-colors"
          >
            <Copy size={11} />
            Duplicate
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-error hover:bg-error/10
              cursor-pointer outline-none transition-colors"
          >
            <Trash2 size={11} />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
})
