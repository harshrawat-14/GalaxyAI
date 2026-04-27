'use client'

import { useState, useCallback } from 'react'
import {
  Type,
  Image,
  Video,
  Brain,
  Crop,
  Film,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { useWorkflowStore } from '@/store/workflow-store'
import type { NodeType } from '@/types/nodes'

const NODE_PALETTE = [
  {
    type: 'text' as NodeType,
    label: 'Text',
    icon: Type,
    color: '#6366f1',
    description: 'Text input for prompts',
  },
  {
    type: 'upload-image' as NodeType,
    label: 'Upload Image',
    icon: Image,
    color: '#f59e0b',
    description: 'Upload images via Transloadit',
  },
  {
    type: 'upload-video' as NodeType,
    label: 'Upload Video',
    icon: Video,
    color: '#ef4444',
    description: 'Upload videos via Transloadit',
  },
  {
    type: 'llm' as NodeType,
    label: 'Run LLM',
    icon: Brain,
    color: '#8b5cf6',
    description: 'Call Google Gemini models',
  },
  {
    type: 'crop-image' as NodeType,
    label: 'Crop Image',
    icon: Crop,
    color: '#22c55e',
    description: 'Crop images with FFmpeg',
  },
  {
    type: 'extract-frame' as NodeType,
    label: 'Extract Frame',
    icon: Film,
    color: '#06b6d4',
    description: 'Extract video frames with FFmpeg',
  },
]

export function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const addNode = useWorkflowStore((s) => s.addNode)

  const handleAddNode = useCallback(
    (type: NodeType) => {
      addNode(type, {
        x: 200 + Math.random() * 300,
        y: 150 + Math.random() * 200,
      })
    },
    [addNode],
  )

  const filtered = NODE_PALETTE.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div
      className={`
        relative flex flex-col bg-panel border-r border-border
        transition-all duration-200 ease-out flex-shrink-0
        ${collapsed ? 'w-12' : 'w-64'}
      `}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-10 flex items-center justify-center
          w-6 h-6 rounded-full bg-panel border border-border
          text-textmuted hover:text-text hover:border-borderhov transition-all"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center gap-2 pt-4 px-1.5">
          {NODE_PALETTE.map((node) => (
            <button
              key={node.type}
              onClick={() => handleAddNode(node.type)}
              title={node.label}
              className="p-2 rounded-lg hover:bg-surface transition-colors"
              style={{ color: node.color }}
            >
              <node.icon size={16} />
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <h2 className="text-xs font-semibold text-textmuted uppercase tracking-wider mb-3">
              Quick Access
            </h2>
            {/* Search */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textsub"
              />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-1.5
                  text-xs text-text placeholder:text-textsub
                  focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Node buttons */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filtered.map((node) => (
              <button
                key={node.type}
                onClick={() => handleAddNode(node.type)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/nextflow-node-type',
                    node.type,
                  )
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg
                  bg-surface hover:bg-borderhov border border-transparent
                  hover:border-border transition-all duration-150 text-left group"
              >
                <div
                  className="flex-shrink-0 p-1.5 rounded-md"
                  style={{ background: `${node.color}20` }}
                >
                  <node.icon size={14} style={{ color: node.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text truncate">
                    {node.label}
                  </p>
                  <p className="text-[10px] text-textsub truncate">
                    {node.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
