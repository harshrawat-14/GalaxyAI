/**
 * Deterministic Trigger.dev run tag, derived from our own DB-generated
 * WorkflowRun id. Known before the run is ever triggered, so the client's
 * realtime subscription can be scoped to it and established *before*
 * triggering — see src/app/api/runs/[runId]/start/route.ts.
 */
export function runTag(runId: string): string {
  return `run:${runId}`;
}
