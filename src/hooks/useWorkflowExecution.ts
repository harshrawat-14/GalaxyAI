'use client'

import { useCallback } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'
import { getExecutionGroups, getUpstreamNodes } from '@/lib/dag'
import { toast } from 'sonner'
import type { RunScope, FlowEdge, FlowNode } from '@/types/workflow'

let activeAbortController: AbortController | null = null

export function cancelActiveExecution() {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}

export function useWorkflowExecution() {
  const executeWorkflow = useCallback(
    async (scope: RunScope, selectedNodeIds?: string[]) => {
      const store = useWorkflowStore.getState()
      const { nodes, edges, workflowId, workflowName, isExecuting } = store

      if (isExecuting) {
        toast.info('A workflow is already running.')
        return
      }

      if (!workflowId) {
        toast.error('Save the workflow first before running.')
        return
      }

      if (nodes.length === 0) {
        toast.error('No nodes to execute.')
        return
      }

      let targetIds: string[]
      if (scope === 'FULL') {
        targetIds = nodes.map((n) => n.id)
      } else {
        const sel =
          selectedNodeIds ?? [...useWorkflowStore.getState().selectedNodeIds]
        targetIds = getUpstreamNodes(sel, edges)
      }

      let groups: FlowNode[][]
      try {
        groups = getExecutionGroups(nodes, edges, targetIds)
      } catch {
        toast.error('Circular dependency in workflow — cannot execute.')
        return
      }

      const controller = new AbortController()
      activeAbortController = controller

      let runId: string
      try {
        const runRes = await fetch(`/api/workflow/${workflowId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, selectedNodeIds: targetIds }),
          signal: controller.signal,
        })

        if (!runRes.ok) {
          toast.error('Failed to create workflow run.')
          activeAbortController = null
          return
        }

        const runData = (await runRes.json()) as { runId: string }
        runId = runData.runId
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to create workflow run.')
        }
        activeAbortController = null
        return
      }

      useWorkflowStore.getState().setExecuting(true, runId)

      const nodeOutputs = new Map<string, Record<string, unknown>>()
      let anyFailed = false
      let cancelled = false

      toast.info(`Running workflow: ${workflowName}`)

      try {
        for (const group of groups) {
          if (controller.signal.aborted) {
            cancelled = true
            break
          }
          await Promise.all(
            group.map(async (node) => {
              if (controller.signal.aborted) return
              useWorkflowStore.getState().setNodeRunning(node.id, true)

              try {
                const inputs = buildNodeInputs(node, edges, nodeOutputs)

                const execRes = await fetch('/api/workflow/execute-node', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nodeId: node.id,
                    nodeType: node.data.type,
                    nodeData: node.data,
                    inputs,
                    runId,
                  }),
                  signal: controller.signal,
                })

                if (!execRes.ok) throw new Error(await execRes.text())

                const result = (await execRes.json()) as Record<string, unknown>
                nodeOutputs.set(node.id, result)

                const s = useWorkflowStore.getState()
                if (node.data.type === 'llm' && result['text']) {
                  s.updateNodeData(node.id, {
                    result: result['text'] as string,
                    error: null,
                  })
                }
                if (
                  (node.data.type === 'crop-image' ||
                    node.data.type === 'extract-frame') &&
                  result['resultUrl']
                ) {
                  s.updateNodeData(node.id, {
                    resultUrl: result['resultUrl'] as string,
                    error: null,
                  })
                }
                if (node.data.type === 'text') {
                  nodeOutputs.set(node.id, {
                    text: node.data.content,
                    output: node.data.content,
                  })
                }
                if (node.data.type === 'upload-image') {
                  nodeOutputs.set(node.id, {
                    imageUrl: node.data.imageUrl,
                    output: node.data.imageUrl,
                  })
                }
                if (node.data.type === 'upload-video') {
                  nodeOutputs.set(node.id, {
                    videoUrl: node.data.videoUrl,
                    output: node.data.videoUrl,
                  })
                }
              } catch (err) {
                if ((err as Error).name === 'AbortError') return
                anyFailed = true
                const message =
                  err instanceof Error ? err.message : 'Unknown error'
                if ('error' in node.data) {
                  useWorkflowStore
                    .getState()
                    .updateNodeData(node.id, { error: message })
                }
                toast.error(`Node "${node.data.label}" failed: ${message}`)
              } finally {
                useWorkflowStore.getState().setNodeRunning(node.id, false)
              }
            }),
          )
        }
      } finally {
        if (controller.signal.aborted) cancelled = true
        // Clear any node still marked running (cancellation safety)
        const s = useWorkflowStore.getState()
        for (const id of [...s.runningNodeIds]) s.setNodeRunning(id, false)
      }

      const finalStatus = cancelled ? 'FAILED' : anyFailed ? 'FAILED' : 'SUCCESS'
      try {
        await fetch(`/api/workflow/${workflowId}/runs/${runId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: finalStatus }),
        })
      } catch {
        /* non-critical: stale-run cleanup will catch it */
      }

      useWorkflowStore.getState().setExecuting(false, null)
      if (activeAbortController === controller) activeAbortController = null

      if (cancelled) {
        toast.warning('Workflow cancelled.')
      } else if (anyFailed) {
        toast.warning('Workflow completed with errors.')
      } else {
        toast.success('Workflow complete!')
      }
    },
    [],
  )

  return { executeWorkflow, cancelExecution: cancelActiveExecution }
}

function buildNodeInputs(
  node: FlowNode,
  edges: FlowEdge[],
  nodeOutputs: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}
  const connectedEdges = edges.filter((e) => e.target === node.id)

  for (const edge of connectedEdges) {
    const sourceOutputs = nodeOutputs.get(edge.source)
    if (!sourceOutputs) continue

    const value =
      sourceOutputs['text'] ??
      sourceOutputs['imageUrl'] ??
      sourceOutputs['videoUrl'] ??
      sourceOutputs['resultUrl'] ??
      sourceOutputs['output']

    if (edge.targetHandle) {
      if (edge.targetHandle === 'images') {
        if (!Array.isArray(inputs['images'])) inputs['images'] = []
        ;(inputs['images'] as unknown[]).push(value)
      } else {
        inputs[edge.targetHandle] = value
      }
    }
  }

  return inputs
}
