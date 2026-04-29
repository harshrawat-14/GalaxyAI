'use client'

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type OnConnect,
  type NodeTypes,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useRef } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'
import { TextNode } from '@/components/nodes/TextNode'
import { UploadImageNode } from '@/components/nodes/UploadImageNode'
import { UploadVideoNode } from '@/components/nodes/UploadVideoNode'
import { LLMNode } from '@/components/nodes/LLMNode'
import { CropImageNode } from '@/components/nodes/CropImageNode'
import { ExtractFrameNode } from '@/components/nodes/ExtractFrameNode'
import { NodeErrorBoundary } from '@/components/nodes/NodeErrorBoundary'
import { AnimatedEdge } from '@/components/canvas/edges/AnimatedEdge'
import { toast } from 'sonner'
import type { NodeType } from '@/types/nodes'
import type { NodeProps, EdgeTypes } from '@xyflow/react'

function withErrorBoundary(
  Component: React.ComponentType<NodeProps>,
  nodeType: string,
) {
  const Wrapped = (props: NodeProps) => (
    <NodeErrorBoundary nodeId={props.id} nodeType={nodeType}>
      <Component {...props} />
    </NodeErrorBoundary>
  )
  Wrapped.displayName = `ErrorBound(${nodeType})`
  return Wrapped
}

const nodeTypes: NodeTypes = {
  'text': withErrorBoundary(TextNode, 'text'),
  'upload-image': withErrorBoundary(UploadImageNode, 'upload-image'),
  'upload-video': withErrorBoundary(UploadVideoNode, 'upload-video'),
  'llm': withErrorBoundary(LLMNode, 'llm'),
  'crop-image': withErrorBoundary(CropImageNode, 'crop-image'),
  'extract-frame': withErrorBoundary(ExtractFrameNode, 'extract-frame'),
}

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
}

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect: storeConnect,
    setViewport,
    setSelectedNodeIds,
    addNode,
  } = useWorkflowStore()

  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const success = storeConnect(connection)
      if (!success) {
        toast.error('Cannot connect: incompatible types, cycle, or handle already wired')
      }
    },
    [storeConnect],
  )

  // Drag-and-drop from sidebar to canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onMoveEnd = useCallback(
    (_: unknown, vp: Viewport) => setViewport(vp),
    [setViewport],
  )

  const onSelectionChange = useCallback(
    ({ nodes: sel }: { nodes: { id: string }[] }) => {
      setSelectedNodeIds(new Set(sel.map((n) => n.id)))
    },
    [setSelectedNodeIds],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData(
        'application/nextflow-node-type',
      ) as NodeType
      if (!type) return

      const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!wrapperBounds) return

      const position = {
        x: event.clientX - wrapperBounds.left - viewport.x,
        y: event.clientY - wrapperBounds.top - viewport.y,
      }

      addNode(type, position)
    },
    [addNode, viewport],
  )

  return (
    <div ref={reactFlowWrapper} className="flex-1 relative overflow-hidden bg-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        defaultViewport={viewport}
        onMoveEnd={onMoveEnd}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-canvas"
        style={{ background: '#0a0a0a' }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnDrag
        panOnScroll={false}
        zoomOnScroll
        zoomOnDoubleClick={false}
        snapToGrid
        snapGrid={[8, 8]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#ffffff"
          style={{ backgroundColor: '#0a0a0a' }}
        />

        <Controls
          className="!bg-surface !border-border !rounded-lg overflow-hidden"
        />

        <MiniMap
          position="bottom-right"
          className="!bg-surface !border-border !rounded-lg"
          nodeColor="#8b5cf640"
          maskColor="#0a0a0a80"
          style={{ width: 160, height: 100 }}
        />
      </ReactFlow>

      {/* Empty state overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-xl bg-surface border border-border flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-textmuted"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <p className="text-sm text-textmuted">
              Drag a node from the sidebar to get started
            </p>
            <p className="text-xs text-textsub">
              or click a node type to add it to the canvas
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
