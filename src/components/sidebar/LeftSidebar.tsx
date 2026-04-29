'use client'

import { useCallback, useState } from 'react'
import { Type, Image, Video, Brain, Crop, Film, PanelLeft } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflow-store'
import type { NodeType } from '@/types/nodes'

const NODE_PALETTE = [
  {
    type: 'text' as NodeType,
    label: 'Text',
    icon: Type,
    color: '#6366f1',
    description: 'Prompt input',
  },
  {
    type: 'upload-image' as NodeType,
    label: 'Image',
    icon: Image,
    color: '#f59e0b',
    description: 'Upload image',
  },
  {
    type: 'upload-video' as NodeType,
    label: 'Video',
    icon: Video,
    color: '#ef4444',
    description: 'Upload video',
  },
  {
    type: 'llm' as NodeType,
    label: 'Run LLM',
    icon: Brain,
    color: '#8b5cf6',
    description: 'Gemini / HuggingFace',
  },
  {
    type: 'crop-image' as NodeType,
    label: 'Crop',
    icon: Crop,
    color: '#22c55e',
    description: 'Crop an image',
  },
  {
    type: 'extract-frame' as NodeType,
    label: 'Extract Frame',
    icon: Film,
    color: '#06b6d4',
    description: 'Pull frame from video',
  },
]

export function LeftSidebar() {
  const addNode = useWorkflowStore((s) => s.addNode)
  const [open, setOpen] = useState(true)

  const handleAddNode = useCallback(
    (type: NodeType) => {
      addNode(type, {
        x: 200 + Math.random() * 300,
        y: 150 + Math.random() * 200,
      })
    },
    [addNode],
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-3 left-3 z-20 p-2 rounded-lg bg-surface border border-border
          text-textmuted hover:text-text hover:bg-panel transition-colors animate-fade-in"
        aria-label="Open node palette"
      >
        <PanelLeft size={15} />
      </button>
    )
  }

  return (
    <div className="w-52 flex flex-col bg-sidebar border-r border-border flex-shrink-0 animate-slide-in-left">
      {/* Header — label + collapse toggle on the right */}
      <div className="px-3 pt-4 pb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-textmuted uppercase tracking-widest pl-1">
          Nodes
        </p>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-md text-textmuted hover:text-text hover:bg-surface transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeft size={14} />
        </button>
      </div>

      {/* Node palette */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {NODE_PALETTE.map((node) => (
          <button
            key={node.type}
            onClick={() => handleAddNode(node.type)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/nextflow-node-type', node.type)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-surface border border-transparent hover:border-border
              transition-all duration-150 text-left group cursor-pointer"
          >
            {/* Icon swatch */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${node.color}18`, border: `1px solid ${node.color}30` }}
            >
              <node.icon size={15} style={{ color: node.color }} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-text leading-tight truncate">
                {node.label}
              </p>
              <p className="text-[10px] text-textsub leading-tight truncate mt-0.5">
                {node.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[9px] text-textsub leading-relaxed">
          Click to add · drag to place
        </p>
      </div>
    </div>
  )
}
