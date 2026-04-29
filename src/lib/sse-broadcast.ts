type Listener = (event: string, data: string) => void

const registry = new Map<string, Set<Listener>>()

export function sseSubscribe(workflowId: string, fn: Listener): () => void {
  if (!registry.has(workflowId)) registry.set(workflowId, new Set())
  registry.get(workflowId)!.add(fn)
  return () => {
    const set = registry.get(workflowId)
    set?.delete(fn)
    if (set?.size === 0) registry.delete(workflowId)
  }
}

export function sseBroadcast(workflowId: string, event: string, data: unknown): void {
  const subs = registry.get(workflowId)
  if (!subs?.size) return
  const payload = JSON.stringify(data)
  for (const fn of subs) fn(event, payload)
}
