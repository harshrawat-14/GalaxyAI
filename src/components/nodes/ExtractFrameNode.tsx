'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Film } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { ExtractFrameNodeData } from '@/types/nodes'
import { cn } from '@/lib/utils'

const INPUT_HANDLE = {
  width: 14,
  height: 14,
  border: '2px solid #1e293b',
  background: '#64748b',
}

const OUTPUT_HANDLE = {
  width: 14,
  height: 14,
  border: '2px solid #1e293b',
  background: '#f59e0b',
}

export const ExtractFrameNode = memo(function ExtractFrameNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as ExtractFrameNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  const update = useCallback(
    <K extends keyof ExtractFrameNodeData>(
      key: K,
      value: ExtractFrameNodeData[K],
    ) => {
      updateNodeData<ExtractFrameNodeData>(id, {
        [key]: value,
      } as Partial<ExtractFrameNodeData>)
    },
    [id, updateNodeData],
  )

  const isInputConnected = (handle: string) =>
    nodeData.connectedInputs[handle] === true

  return (
    <BaseNode
      id={id}
      isRunning={nodeData.isRunning}
      isSelected={selected}
      title={nodeData.label}
      icon={<Film size={12} />}
      headerColor="#06b6d4"
      minWidth={280}
    >
      {/* Input: video_url */}
      <Handle
        type="target"
        position={Position.Left}
        id="video_url"
        title="Video Source (video)"
        style={{ ...INPUT_HANDLE, top: 72 }}
      />

      {/* Input: timestamp */}
      <Handle
        type="target"
        position={Position.Left}
        id="timestamp"
        title="Timestamp (text or number)"
        style={{ ...INPUT_HANDLE, top: 130 }}
      />

      {/* Video URL input — greyed out when connected */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-error" />
          Video Source
          {isInputConnected('video_url') && (
            <span className="text-accent text-[9px]">← connected</span>
          )}
        </label>
        {!isInputConnected('video_url') && (
          <input
            value={nodeData.videoUrl ?? ''}
            onChange={(e) => update('videoUrl', e.target.value || null)}
            placeholder="Paste video URL..."
            disabled={nodeData.isRunning}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text placeholder:text-textsub',
              'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
            )}
          />
        )}
      </div>

      {/* Timestamp input */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }} />
          Timestamp
          {isInputConnected('timestamp') && (
            <span className="text-accent text-[9px]">← connected</span>
          )}
        </label>
        {!isInputConnected('timestamp') && (
          <input
            type="text"
            value={nodeData.timestamp ?? ''}
            onChange={(e) => update('timestamp', e.target.value)}
            placeholder='e.g. "30" or "50%"'
            disabled={nodeData.isRunning}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text font-mono placeholder:text-textsub',
              'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
            )}
          />
        )}
        <p className="text-[9px] text-textsub">
          Seconds (e.g. &quot;30&quot;) or percentage (e.g. &quot;50%&quot;)
        </p>
      </div>

      {/* Result display */}
      {nodeData.resultUrl && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] text-textmuted uppercase tracking-wider">
            Extracted Frame
          </p>
          <img
            src={nodeData.resultUrl}
            alt="Extracted frame"
            className="w-full h-24 object-cover rounded-lg border border-border"
          />
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
        title="Extracted Frame Output"
        style={OUTPUT_HANDLE}
      />
    </BaseNode>
  )
})
