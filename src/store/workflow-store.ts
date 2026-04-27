'use client'

import { enableMapSet } from 'immer'
import { create, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'

enableMapSet()
import { temporal, type TemporalState } from 'zundo'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Viewport,
} from '@xyflow/react'
import type { FlowNode, FlowEdge } from '@/types/workflow'
import type { NodeData, NodeType } from '@/types/nodes'
import { CONNECTION_RULES, OUTPUT_HANDLE_TYPES } from '@/types/nodes'

// ─── Store State Interface ─────────────────────────────────────

interface WorkflowStore {
  // State
  workflowId: string | null
  workflowName: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: Viewport
  isDirty: boolean
  selectedNodeIds: Set<string>
  runningNodeIds: Set<string>
  isExecuting: boolean
  currentRunId: string | null

  // Actions
  setWorkflowId: (id: string | null) => void
  setWorkflowName: (name: string) => void
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => boolean
  addNode: (type: NodeType, position?: { x: number; y: number }) => void
  updateNodeData: <T extends NodeData>(nodeId: string, data: Partial<T>) => void
  deleteNode: (nodeId: string) => void
  setSelectedNodeIds: (ids: Set<string>) => void
  setNodeRunning: (nodeId: string, running: boolean) => void
  setExecuting: (executing: boolean, runId?: string | null) => void
  setViewport: (viewport: Viewport) => void
  markClean: () => void
  loadWorkflow: (payload: {
    id: string
    name: string
    nodes: FlowNode[]
    edges: FlowEdge[]
    viewport?: Viewport
  }) => void
  resetWorkflow: () => void
}

// ─── Connection Validation ─────────────────────────────────────

function isConnectionValid(
  connection: Connection,
  nodes: FlowNode[],
  edges: FlowEdge[],
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection
  if (!source || !target || !sourceHandle || !targetHandle) return false
  if (source === target) return false

  // Prevent duplicate connections to same target handle
  const existingConnection = edges.find(
    e => e.target === target && e.targetHandle === targetHandle,
  )
  if (existingConnection) return false

  const sourceNode = nodes.find(n => n.id === source)
  const targetNode = nodes.find(n => n.id === target)
  if (!sourceNode || !targetNode) return false

  const sourceType = OUTPUT_HANDLE_TYPES[sourceNode.data.type]
  const ruleKey = `${targetNode.data.type}::${targetHandle}`
  const allowedTypes = CONNECTION_RULES[ruleKey]

  // No rule means we allow the connection
  if (!allowedTypes) return true
  return allowedTypes.includes(sourceType)
}

// ─── DAG Cycle Detection ───────────────────────────────────────

function wouldCreateCycle(
  edges: FlowEdge[],
  connection: Connection,
): boolean {
  if (!connection.source || !connection.target) return false

  const newEdges = [...edges, { source: connection.source, target: connection.target }]
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function dfs(node: string): boolean {
    visited.add(node)
    recStack.add(node)
    const neighbors = newEdges.filter(e => e.source === node).map(e => e.target)
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && dfs(neighbor)) return true
      if (recStack.has(neighbor)) return true
    }
    recStack.delete(node)
    return false
  }

  const allNodes = new Set([...newEdges.map(e => e.source), ...newEdges.map(e => e.target)])
  for (const node of allNodes) {
    if (!visited.has(node) && dfs(node)) return true
  }
  return false
}

// ─── Default Node Data Factory ─────────────────────────────────

function createDefaultNodeData(type: NodeType): NodeData {
  switch (type) {
    case 'text':
      return { type, label: '', content: '', isRunning: false }
    case 'upload-image':
      return { type, label: '', imageUrl: null, fileName: null, isRunning: false }
    case 'upload-video':
      return { type, label: '', videoUrl: null, fileName: null, isRunning: false }
    case 'llm':
      return {
        type,
        label: '',
        model: 'llama-3.3-70b-versatile',
        systemPrompt: '',
        userMessage: '',
        result: null,
        isRunning: false,
        error: null,
      }
    case 'crop-image':
      return {
        type,
        label: '',
        imageUrl: null,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        resultUrl: null,
        isRunning: false,
        error: null,
        connectedInputs: {},
      }
    case 'extract-frame':
      return {
        type,
        label: '',
        videoUrl: null,
        timestamp: '0',
        resultUrl: null,
        isRunning: false,
        error: null,
        connectedInputs: {},
      }
  }
}

const NODE_LABELS: Record<NodeType, string> = {
  'text': 'Text',
  'upload-image': 'Upload Image',
  'upload-video': 'Upload Video',
  'llm': 'Run LLM',
  'crop-image': 'Crop Image',
  'extract-frame': 'Extract Frame',
}

let nodeIdCounter = 1

// ─── Store Creation ────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowStore>()(
  temporal(
    immer((set, get) => ({
      workflowId: null,
      workflowName: 'Untitled Workflow',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      isDirty: false,
      selectedNodeIds: new Set<string>(),
      runningNodeIds: new Set<string>(),
      isExecuting: false,
      currentRunId: null,

      setWorkflowId: (id) =>
        set((s) => {
          s.workflowId = id
        }),

      setWorkflowName: (name) =>
        set((s) => {
          s.workflowName = name
          s.isDirty = true
        }),

      setNodes: (nodes) =>
        set((s) => {
          s.nodes = nodes
          s.isDirty = true
        }),

      setEdges: (edges) =>
        set((s) => {
          s.edges = edges
          s.isDirty = true
        }),

      onNodesChange: (changes) =>
        set((s) => {
          s.nodes = applyNodeChanges(changes, s.nodes) as FlowNode[]
          s.isDirty = true
        }),

      onEdgesChange: (changes) =>
        set((s) => {
          s.edges = applyEdgeChanges(changes, s.edges)
          s.isDirty = true
        }),

      onConnect: (connection) => {
        const { nodes, edges } = get()
        if (!isConnectionValid(connection, nodes, edges)) return false
        if (wouldCreateCycle(edges, connection)) return false

        set((s) => {
          s.edges = addEdge(
            {
              ...connection,
              type: 'animated',
              style: { stroke: '#8b5cf6', strokeWidth: 2 },
            },
            s.edges,
          )
          // Mark connected inputs on target node
          const targetNode = s.nodes.find((n) => n.id === connection.target)
          if (
            targetNode &&
            'connectedInputs' in targetNode.data &&
            connection.targetHandle
          ) {
            const data = targetNode.data as { connectedInputs: Record<string, boolean> }
            data.connectedInputs[connection.targetHandle] = true
          }
          s.isDirty = true
        })
        return true
      },

      addNode: (type, position) =>
        set((s) => {
          const id = `node-${nodeIdCounter++}`
          const data = createDefaultNodeData(type)
          data.label = NODE_LABELS[type]
          const newNode: FlowNode = {
            id,
            type,
            position: position ?? {
              x: 100 + Math.random() * 200,
              y: 100 + Math.random() * 200,
            },
            data,
          }
          s.nodes.push(newNode)
          s.isDirty = true
        }),

      updateNodeData: (nodeId, data) =>
        set((s) => {
          const node = s.nodes.find((n) => n.id === nodeId)
          if (node) {
            Object.assign(node.data, data)
            s.isDirty = true
          }
        }),

      deleteNode: (nodeId) =>
        set((s) => {
          s.nodes = s.nodes.filter((n) => n.id !== nodeId)
          s.edges = s.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId,
          )
          s.isDirty = true
        }),

      setSelectedNodeIds: (ids) =>
        set((s) => {
          if (
            ids.size === s.selectedNodeIds.size &&
            [...ids].every((id) => s.selectedNodeIds.has(id))
          ) return
          s.selectedNodeIds = ids
        }),

      setNodeRunning: (nodeId, running) =>
        set((s) => {
          const node = s.nodes.find((n) => n.id === nodeId)
          if (node) node.data.isRunning = running
          if (running) s.runningNodeIds.add(nodeId)
          else s.runningNodeIds.delete(nodeId)
        }),

      setExecuting: (executing, runId) =>
        set((s) => {
          s.isExecuting = executing
          if (runId !== undefined) s.currentRunId = runId
        }),

      setViewport: (viewport) =>
        set((s) => {
          s.viewport = viewport
        }),

      markClean: () =>
        set((s) => {
          s.isDirty = false
        }),

      loadWorkflow: ({ id, name, nodes, edges, viewport }) =>
        set((s) => {
          s.workflowId = id
          s.workflowName = name
          s.nodes = nodes
          s.edges = edges
          s.viewport = viewport ?? { x: 0, y: 0, zoom: 1 }
          s.isDirty = false
        }),

      resetWorkflow: () =>
        set((s) => {
          s.workflowId = null
          s.workflowName = 'Untitled Workflow'
          s.nodes = []
          s.edges = []
          s.isDirty = false
        }),
    })),
    { limit: 50 },
  ),
)

// ─── Temporal Store Hook (zundo 2.x pattern) ──────────────────

export function useTemporalStore<T>(
  selector: (state: TemporalState<WorkflowStore>) => T,
): T {
  return useStore(useWorkflowStore.temporal, selector)
}
