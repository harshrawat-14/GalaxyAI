import type { Node, Edge, Viewport } from '@xyflow/react'
import type { NodeData } from './nodes'

export type FlowNode = Node<NodeData>
export type FlowEdge = Edge

export interface WorkflowState {
  id: string | null
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: Viewport
  isDirty: boolean
}

export type RunScope = 'FULL' | 'PARTIAL' | 'SINGLE'

export interface WorkflowRun {
  id: string
  workflowId: string
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL'
  scope: RunScope
  selectedNodeIds: string[]
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  nodeRuns: NodeRunResult[]
}

export interface NodeRunResult {
  id: string
  nodeId: string
  nodeType: string
  nodeLabel: string
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PENDING'
  inputs: Record<string, unknown> | null
  outputs: Record<string, unknown> | null
  error: string | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
}
