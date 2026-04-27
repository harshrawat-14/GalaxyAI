'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Brain, ChevronDown } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { LLMNodeData, GroqModel } from '@/types/nodes'
import { cn } from '@/lib/utils'

const MODELS: GroqModel[] = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
]

const HANDLE_BASE = {
  width: 10,
  height: 10,
  border: '2px solid #222222',
}

export const LLMNode = memo(function LLMNode({ id, data, selected }: NodeProps) {
  const nodeData = data as LLMNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  const update = useCallback(
    <K extends keyof LLMNodeData>(key: K, value: LLMNodeData[K]) => {
      updateNodeData<LLMNodeData>(id, { [key]: value } as Partial<LLMNodeData>)
    },
    [id, updateNodeData],
  )

  return (
    <BaseNode
      id={id}
      isRunning={nodeData.isRunning}
      isSelected={selected}
      title="Run LLM"
      icon={<Brain size={12} />}
      headerColor="#8b5cf6"
      minWidth={320}
    >
      {/* Input: system_prompt */}
      <Handle
        type="target"
        position={Position.Left}
        id="system_prompt"
        style={{ ...HANDLE_BASE, background: '#8b5cf6', top: 72 }}
      />

      {/* Input: user_message */}
      <Handle
        type="target"
        position={Position.Left}
        id="user_message"
        style={{ ...HANDLE_BASE, background: '#22c55e', top: 120 }}
      />

      {/* Input: images */}
      <Handle
        type="target"
        position={Position.Left}
        id="images"
        style={{ ...HANDLE_BASE, background: '#f59e0b', top: 168 }}
      />

      {/* Model selector */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider">
          Model
        </label>
        <div className="relative">
          <select
            value={nodeData.model}
            onChange={(e) => update('model', e.target.value as GroqModel)}
            disabled={nodeData.isRunning}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text appearance-none cursor-pointer',
              'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
              nodeData.isRunning && 'opacity-50 cursor-not-allowed',
            )}
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-textmuted pointer-events-none"
          />
        </div>
      </div>

      {/* System prompt */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent" />
          System Prompt
          <span className="text-textsub">(optional)</span>
        </label>
        <textarea
          value={nodeData.systemPrompt}
          onChange={(e) => update('systemPrompt', e.target.value)}
          placeholder="You are a helpful assistant..."
          disabled={nodeData.isRunning}
          rows={2}
          className={cn(
            'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
            'text-xs text-text resize-none placeholder:text-textsub',
            'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
          )}
        />
      </div>

      {/* User message */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          User Message
        </label>
        <textarea
          value={nodeData.userMessage}
          onChange={(e) => update('userMessage', e.target.value)}
          placeholder="Enter your message..."
          disabled={nodeData.isRunning}
          rows={2}
          className={cn(
            'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
            'text-xs text-text resize-none placeholder:text-textsub',
            'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
          )}
        />
      </div>

      {/* Result inline display */}
      {nodeData.result && (
        <div className="mt-2 p-2 bg-surface border border-border rounded-lg space-y-1">
          <p className="text-[10px] text-textmuted uppercase tracking-wider">
            Output
          </p>
          <p className="text-xs text-text whitespace-pre-wrap max-h-32 overflow-y-auto nodrag nowheel">
            {nodeData.result}
          </p>
        </div>
      )}

      {/* Error display */}
      {nodeData.error && (
        <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-xs text-error">{nodeData.error}</p>
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ ...HANDLE_BASE, background: '#22c55e' }}
      />
    </BaseNode>
  )
})
