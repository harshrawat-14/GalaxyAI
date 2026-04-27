'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Type } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { TextNodeData } from '@/types/nodes'
import { cn } from '@/lib/utils'

const HANDLE_STYLE = {
  width: 10,
  height: 10,
  border: '2px solid #222222',
  background: '#6366f1',
}

export const TextNode = memo(function TextNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TextNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  const handleChange = useCallback(
    (content: string) => {
      updateNodeData<TextNodeData>(id, { content })
    },
    [id, updateNodeData],
  )

  return (
    <BaseNode
      id={id}
      isRunning={nodeData.isRunning}
      isSelected={selected}
      title={nodeData.label}
      icon={<Type size={12} />}
      headerColor="#6366f1"
    >
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider">
          Content
        </label>
        <textarea
          value={nodeData.content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter text content..."
          disabled={nodeData.isRunning}
          rows={3}
          className={cn(
            'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
            'text-xs text-text resize-none placeholder:text-textsub',
            'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
            nodeData.isRunning && 'opacity-50 cursor-not-allowed',
          )}
        />
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={HANDLE_STYLE}
      />
    </BaseNode>
  )
})
