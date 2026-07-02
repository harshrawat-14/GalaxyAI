import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Shared running -> success|failed lifecycle for a NodeExecution row
 * (timestamps, duration, error message). Every executable node task wraps its
 * work in this so persistence bookkeeping isn't duplicated per task (SRP).
 */
export async function withNodeExecutionTracking<TOutput>(
  nodeExecutionId: string,
  run: () => Promise<TOutput>,
  toOutput: (output: TOutput) => Prisma.InputJsonValue,
): Promise<TOutput> {
  const startedAt = new Date();

  // A transient DB error here used to propagate before the try/catch below
  // ever ran, leaving the row stuck at its initial "pending" insert state
  // forever — no error message, indistinguishable from "never started".
  // Confirmed live against a real (momentarily unreachable) Neon instance.
  try {
    await prisma.nodeExecution.update({
      where: { id: nodeExecutionId },
      data: { status: "running", startedAt },
    });
  } catch (error) {
    await markFailed(nodeExecutionId, startedAt, error);
    throw error;
  }

  try {
    const output = await run();
    await prisma.nodeExecution.update({
      where: { id: nodeExecutionId },
      data: {
        status: "success",
        output: toOutput(output),
        durationMs: Date.now() - startedAt.getTime(),
        finishedAt: new Date(),
      },
    });
    return output;
  } catch (error) {
    await markFailed(nodeExecutionId, startedAt, error);
    throw error;
  }
}

/** Best-effort — if the DB is still unreachable, at least don't lose the original error. */
async function markFailed(nodeExecutionId: string, startedAt: Date, error: unknown): Promise<void> {
  try {
    await prisma.nodeExecution.update({
      where: { id: nodeExecutionId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt.getTime(),
        finishedAt: new Date(),
      },
    });
  } catch (writeError) {
    console.error(
      `[taskRun] could not persist failure for NodeExecution ${nodeExecutionId}; original error:`,
      error,
      "; write error:",
      writeError,
    );
  }
}
