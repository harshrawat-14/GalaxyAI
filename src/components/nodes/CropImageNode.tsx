'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Crop } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { CropImageNodeData } from '@/types/nodes'
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

export const CropImageNode = memo(function CropImageNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as CropImageNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)

  const update = useCallback(
    <K extends keyof CropImageNodeData>(key: K, value: CropImageNodeData[K]) => {
      updateNodeData<CropImageNodeData>(id, { [key]: value } as Partial<CropImageNodeData>)
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
      icon={<Crop size={12} />}
      headerColor="#22c55e"
      minWidth={300}
    >
      {/* Input: image_url */}
      <Handle
        type="target"
        position={Position.Left}
        id="image_url"
        title="Image Source (image)"
        style={{ ...INPUT_HANDLE, top: 72 }}
      />

      {/* Input: x_percent */}
      <Handle
        type="target"
        position={Position.Left}
        id="x_percent"
        title="X Offset % (text or number)"
        style={{ ...INPUT_HANDLE, top: 120 }}
      />

      {/* Input: y_percent */}
      <Handle
        type="target"
        position={Position.Left}
        id="y_percent"
        title="Y Offset % (text or number)"
        style={{ ...INPUT_HANDLE, top: 160 }}
      />

      {/* Input: width_percent */}
      <Handle
        type="target"
        position={Position.Left}
        id="width_percent"
        title="Width % (text or number)"
        style={{ ...INPUT_HANDLE, top: 200 }}
      />

      {/* Input: height_percent */}
      <Handle
        type="target"
        position={Position.Left}
        id="height_percent"
        title="Height % (text or number)"
        style={{ ...INPUT_HANDLE, top: 240 }}
      />

      {/* Image URL input — greyed out when connected */}
      <div className="space-y-1">
        <label className="text-[10px] text-textmuted uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Image Source
          {isInputConnected('image_url') && (
            <span className="text-accent text-[9px]">← connected</span>
          )}
        </label>
        {!isInputConnected('image_url') && (
          <input
            value={nodeData.imageUrl ?? ''}
            onChange={(e) => update('imageUrl', e.target.value || null)}
            placeholder="Paste image URL..."
            disabled={nodeData.isRunning}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text placeholder:text-textsub',
              'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
            )}
          />
        )}
      </div>

      {/* Crop parameters */}
      <div className="grid grid-cols-2 gap-2">
        {(['xPercent', 'yPercent', 'widthPercent', 'heightPercent'] as const).map(
          (param) => {
            const handleId = param.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
            const connected = isInputConnected(handleId)
            return (
              <div key={param} className="space-y-0.5">
                <label className="text-[9px] text-textsub uppercase tracking-wider">
                  {param.replace(/Percent/, ' %')}
                  {connected && (
                    <span className="text-accent ml-1">←</span>
                  )}
                </label>
                <input
                  type="number"
                  value={nodeData[param]}
                  onChange={(e) =>
                    update(param, parseFloat(e.target.value) || 0)
                  }
                  disabled={nodeData.isRunning || connected}
                  min={0}
                  max={100}
                  className={cn(
                    'w-full bg-surface border border-border rounded-md px-2 py-1',
                    'text-[11px] text-text font-mono',
                    'focus:outline-none focus:border-accent transition-colors nodrag nowheel',
                    connected && 'opacity-40 cursor-not-allowed',
                  )}
                />
              </div>
            )
          },
        )}
      </div>

      {/* Result display */}
      {nodeData.resultUrl && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] text-textmuted uppercase tracking-wider">
            Cropped Result
          </p>
          <img
            src={nodeData.resultUrl}
            alt="Cropped result"
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
        title="Cropped Image Output"
        style={OUTPUT_HANDLE}
      />
    </BaseNode>
  )
})
