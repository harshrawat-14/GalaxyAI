import type { FlowNode, FlowEdge } from '@/types/workflow'

/** Returns nodes in topological order as parallel execution groups */
export function getExecutionGroups(
  nodes: FlowNode[],
  edges: FlowEdge[],
  targetNodeIds?: string[],
): FlowNode[][] {
  const nodeSet = new Set(targetNodeIds ?? nodes.map(n => n.id))

  // Build adjacency: dependencies (what a node depends ON)
  const deps = new Map<string, Set<string>>()
  for (const node of nodes) {
    if (nodeSet.has(node.id)) deps.set(node.id, new Set())
  }
  for (const edge of edges) {
    if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
      deps.get(edge.target)?.add(edge.source)
    }
  }

  const completed = new Set<string>()
  const groups: FlowNode[][] = []

  while (completed.size < nodeSet.size) {
    // Find all nodes whose deps are fully completed
    const ready: FlowNode[] = []
    for (const [nodeId, nodeDeps] of deps) {
      if (!completed.has(nodeId) && [...nodeDeps].every(d => completed.has(d))) {
        const node = nodes.find(n => n.id === nodeId)
        if (node) ready.push(node)
      }
    }

    if (ready.length === 0) {
      throw new Error('Circular dependency detected in workflow DAG')
    }

    groups.push(ready)
    ready.forEach(n => completed.add(n.id))
  }

  return groups
}

/** Collect all upstream node IDs for a given set of target nodes */
export function getUpstreamNodes(
  nodeIds: string[],
  edges: FlowEdge[],
): string[] {
  const result = new Set<string>(nodeIds)
  const queue = [...nodeIds]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of edges) {
      if (edge.target === current && !result.has(edge.source)) {
        result.add(edge.source)
        queue.push(edge.source)
      }
    }
  }

  return [...result]
}

/** Get all direct upstream outputs for a node's specific handle */
export function getInputsForHandle(
  nodeId: string,
  handle: string,
  edges: FlowEdge[],
  nodeOutputs: Map<string, Record<string, unknown>>,
): unknown[] {
  return edges
    .filter(e => e.target === nodeId && e.targetHandle === handle)
    .map(e => {
      const outputs = nodeOutputs.get(e.source)
      return outputs?.['output'] ?? outputs?.['text'] ?? outputs?.['imageUrl'] ?? outputs?.['videoUrl'] ?? null
    })
    .filter(Boolean)
}
