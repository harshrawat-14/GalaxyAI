import type { Prisma } from "@prisma/client";
import type { DeserializedJson } from "@trigger.dev/core";
import { logger, metadata, task } from "@trigger.dev/sdk";
import { directParents } from "@/domain/dag";
import { getNodeSpec, type RequestInputsConfig } from "@/domain/nodes";
import type { GraphNode, RunStatus, WorkflowGraph } from "@/domain/types";
import { prisma } from "@/lib/prisma";
import {
  buildTaskPayload,
  extractOutputValue,
  isExecutableKind,
  localExecutionOutput,
  resolveLocalOutputs,
  TASK_BY_KIND,
} from "./registry";
import { MissingUpstreamInputError, resolveInputs } from "./resolve";

/**
 * Trigger.dev's metadata.flush() silently no-ops if another flush is already
 * in flight (`if (this.isFlushing) return;` in StandardMetadataManager) —
 * confirmed live: concurrent flush() calls from this orchestrator's parallel
 * promise-graph branches (the exact fan-out this app demonstrates) raced,
 * and the loser's operation sat queued, sometimes never delivered before a
 * node's next state change. Serializing every flush through one promise
 * chain means each call only starts once the previous one has actually
 * completed, so `isFlushing` is never true when a new flush begins.
 */
let pendingMetadataFlush: Promise<void> = Promise.resolve();
function flushMetadataSerialized(): Promise<void> {
  pendingMetadataFlush = pendingMetadataFlush.then(() => metadata.flush());
  return pendingMetadataFlush;
}

export interface OrchestratePayload {
  runId: string;
  workflowId: string;
  /** Node ids included in this run (full run = every node id in the graph). */
  scope: string[];
  graph: WorkflowGraph;
  /** Pre-created NodeExecution row id for every node in `scope`. */
  nodeExecutionIdByNodeId: Record<string, string>;
}

/** Best-effort message out of a TaskRunResult's `error` (typed `unknown` — Trigger.dev
 * serializes failures as a discriminated union, not a native Error, across the wire). */
function taskErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

/**
 * Promise-graph run task: each node awaits only its direct (in-scope)
 * parents, memoized so a node starts the instant its own dependencies
 * finish — never blocking on unrelated siblings (LLD §6, AGENT.md §2.3).
 *
 * Executable nodes are run via `task.triggerAndWait()` — Trigger.dev's native
 * checkpoint/restore wait primitive, not a manual poll loop. v3 rejected
 * concurrent `triggerAndWait` calls ("Parallel waits are not supported"),
 * which is why this used to be `task.trigger()` + `runs.poll()`; v4's CRIU-
 * based checkpointing lifts that restriction, so the orchestrator's own
 * concurrent `Promise.all(parents.map(resultFor))` fan-out can wait on
 * multiple child tasks at once without polling.
 */
export const orchestrate = task({
  id: "run.orchestrate",
  run: async (payload: OrchestratePayload) => {
    const { runId, workflowId, scope, graph, nodeExecutionIdByNodeId } = payload;
    const scopeSet = new Set(scope);
    const memo = new Map<string, Promise<Record<string, unknown>>>();

    logger.info("[orchestrate] run started", { runId, workflowId, scope });

    function nodeById(id: string): GraphNode {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node) throw new Error(`Unknown node "${id}" in run ${runId}`);
      return node;
    }

    function nodeExecutionIdFor(id: string): string {
      const nodeExecutionId = nodeExecutionIdByNodeId[id];
      if (!nodeExecutionId) throw new Error(`No NodeExecution row for node "${id}" in run ${runId}`);
      return nodeExecutionId;
    }

    /** In-scope parent -> its live promise result; out-of-scope -> cached/manual value. */
    async function getUpstreamResult(sourceId: string, sourceHandle: string): Promise<unknown> {
      if (scopeSet.has(sourceId)) {
        const result = await resultFor(sourceId);
        return result[sourceHandle];
      }
      return getCachedOrManualOutput(nodeById(sourceId), sourceHandle);
    }

    async function getCachedOrManualOutput(node: GraphNode, handle: string): Promise<unknown> {
      const last = await prisma.nodeExecution.findFirst({
        where: { nodeId: node.id, status: "success", run: { workflowId } },
        orderBy: { finishedAt: "desc" },
      });
      const cached = (last?.output as Record<string, unknown> | null)?.[handle];
      if (cached !== undefined && cached !== null) return cached;

      const spec = getNodeSpec(node.kind);
      const manual = spec.manualValue?.(node.config, handle);
      if (manual !== undefined && manual !== null) return manual;

      if (node.kind === "request-inputs") {
        const config = node.config as RequestInputsConfig;
        const fieldValue = config.fields.find((f) => f.id === handle)?.value;
        if (fieldValue != null) return fieldValue;
      }

      throw new MissingUpstreamInputError(node.id, handle);
    }

    function resultFor(id: string): Promise<Record<string, unknown>> {
      const existing = memo.get(id);
      if (existing) return existing;

      const promise = (async (): Promise<Record<string, unknown>> => {
        const node = nodeById(id);
        const parents = directParents(graph, id).filter((p) => scopeSet.has(p));
        await Promise.all(parents.map(resultFor)); // node starts the instant its own parents finish

        logger.info("[orchestrate] node starting", { runId, nodeId: id, kind: node.kind, parents });

        // Run metadata drives the canvas glow via useRealtimeRun (LLD §9, §10.2).
        metadata.set(id, { status: "running" });
        await flushMetadataSerialized();

        try {
          const inputs = await resolveInputs(node, graph, getUpstreamResult);
          const spec = getNodeSpec(node.kind);

          // Persist the resolved inputs (URLs/text only — media is inlined later
          // at call time) so the History detail view can show "inputs used" per
          // node (spec: Workflow History node-level details).
          await prisma.nodeExecution.update({
            where: { id: nodeExecutionIdFor(id) },
            data: { inputs: inputs as Prisma.InputJsonValue },
          });

          if (!spec.executable) {
            const outputs = resolveLocalOutputs(node);
            const recordOutput = localExecutionOutput(node, inputs, outputs) as Prisma.InputJsonValue;
            await finalizeLocalNodeExecution(nodeExecutionIdFor(id), recordOutput);
            metadata.set(id, { status: "success", output: recordOutput as DeserializedJson });
            await flushMetadataSerialized();
            logger.info("[orchestrate] node finished (local)", { runId, nodeId: id, kind: node.kind });
            return outputs;
          }

          if (!isExecutableKind(node.kind)) {
            throw new Error(`Node kind "${node.kind}" is executable but has no registered task`);
          }

          const nodeExecutionId = nodeExecutionIdFor(id);
          const taskPayload = buildTaskPayload(node, inputs, nodeExecutionId);
          const handler = TASK_BY_KIND[node.kind];

          logger.info("[orchestrate] dispatching to Trigger.dev task", { runId, nodeId: id, kind: node.kind });
          const completed = await handler.triggerAndWait(taskPayload as never);
          if (!completed.ok) {
            const message = taskErrorMessage(completed.error);
            logger.error("[orchestrate] node task failed", { runId, nodeId: id, kind: node.kind, message });
            throw new Error(`${node.kind} task failed: ${message}`);
          }

          const value = extractOutputValue(node.kind, completed.output);
          const outputPortId = getNodeSpec(node.kind).outputs(node.config)[0]?.id;
          const result = outputPortId ? { [outputPortId]: value } : {};
          metadata.set(id, { status: "success", output: result as DeserializedJson });
          await flushMetadataSerialized();
          logger.info("[orchestrate] node finished", { runId, nodeId: id, kind: node.kind });
          return result;
        } catch (error) {
          metadata.set(id, { status: "failed" });
          await flushMetadataSerialized();
          logger.error("[orchestrate] node errored", {
            runId,
            nodeId: id,
            kind: node.kind,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      })();

      memo.set(id, promise);
      return promise;
    }

    const settled = await Promise.allSettled(scope.map(resultFor));
    await finalizeRun(runId, settled);
    logger.info("[orchestrate] run finished", {
      runId,
      results: settled.map((s) => s.status),
    });
    return { runId, results: settled.map((s) => s.status) };
  },
});

async function finalizeLocalNodeExecution(nodeExecutionId: string, output: Prisma.InputJsonValue) {
  const now = new Date();
  await prisma.nodeExecution.update({
    where: { id: nodeExecutionId },
    data: { status: "success", output, startedAt: now, finishedAt: now, durationMs: 0 },
  });
}

async function finalizeRun(runId: string, settled: PromiseSettledResult<unknown>[]) {
  const succeeded = settled.filter((s) => s.status === "fulfilled").length;
  const status: RunStatus =
    succeeded === settled.length ? "success" : succeeded === 0 ? "failed" : "partial";

  const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: runId } });
  const finishedAt = new Date();
  await prisma.$transaction([
    prisma.workflowRun.update({
      where: { id: runId },
      data: { status, finishedAt, durationMs: finishedAt.getTime() - run.startedAt.getTime() },
    }),
    // Any node still "pending" here never ran because an upstream node failed —
    // mark it "skipped" so a partial run reads clearly instead of leaving those
    // nodes stuck looking like they're still queued.
    prisma.nodeExecution.updateMany({
      where: { runId, status: "pending" },
      data: { status: "skipped", finishedAt },
    }),
    prisma.workflow.update({ where: { id: run.workflowId }, data: { status: "idle" } }),
  ]);
}
