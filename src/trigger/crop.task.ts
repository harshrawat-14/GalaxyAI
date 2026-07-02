import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { logger, task, wait } from "@trigger.dev/sdk";
import { serverEnv } from "@/env";
import { CROP_ARTIFICIAL_DELAY_SECONDS } from "@/lib/constants";
import { percentBoxToPixels } from "@/lib/cropMath";
import { startTransloaditUpload, type TransloaditWebhookResult } from "@/lib/transloadit";
import { withNodeExecutionTracking } from "./taskRun";

const execFileAsync = promisify(execFile);

export interface CropTaskPayload {
  nodeExecutionId: string;
  imageUrl: string;
  /** Percentages 0-100, converted to pixels against the real image size. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropTaskOutput {
  url: string;
}

async function probeDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filePath,
  ]);
  const stream = JSON.parse(stdout).streams?.[0];
  if (!stream) throw new Error(`ffprobe found no image stream in ${filePath}`);
  return { width: stream.width, height: stream.height };
}

/**
 * Crops an image by percentage box, with a mandatory 30s+ durable wait before
 * any work begins (AGENT.md §2.2 — never remove or shorten). The wait uses
 * Trigger.dev's checkpointed `wait.for`, not a blocking sleep.
 */
export const cropExecute = task({
  id: "crop.execute",
  run: async (payload: CropTaskPayload): Promise<CropTaskOutput> => {
    logger.info("[crop.execute] task started", {
      nodeExecutionId: payload.nodeExecutionId,
      box: { x: payload.x, y: payload.y, width: payload.width, height: payload.height },
    });

    return withNodeExecutionTracking(
      payload.nodeExecutionId,
      async () => {
        logger.info("[crop] starting mandatory artificial delay", {
          nodeExecutionId: payload.nodeExecutionId,
          seconds: CROP_ARTIFICIAL_DELAY_SECONDS,
        });
        await wait.for({ seconds: CROP_ARTIFICIAL_DELAY_SECONDS });
        logger.info("[crop] delay complete, starting FFmpeg pipeline", { nodeExecutionId: payload.nodeExecutionId });

        const dir = await mkdtemp(path.join(tmpdir(), "nextflow-crop-"));
        try {
          const inputPath = path.join(dir, "input");
          const outputPath = path.join(dir, "output.png");

          logger.info("[crop] downloading source image", { nodeExecutionId: payload.nodeExecutionId, imageUrl: payload.imageUrl });
          const res = await fetch(payload.imageUrl);
          if (!res.ok) {
            logger.error("[crop] source image download failed", { nodeExecutionId: payload.nodeExecutionId, status: res.status });
            throw new Error(`Failed to download crop input: ${payload.imageUrl} (${res.status})`);
          }
          await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));

          const dimensions = await probeDimensions(inputPath);
          const box = percentBoxToPixels(payload, dimensions);
          logger.info("[crop] ffprobe dimensions resolved", { nodeExecutionId: payload.nodeExecutionId, dimensions, box });

          await execFileAsync("ffmpeg", [
            "-y",
            "-i",
            inputPath,
            "-vf",
            `crop=${box.width}:${box.height}:${box.x}:${box.y}`,
            outputPath,
          ]);
          logger.info("[crop] ffmpeg crop complete", { nodeExecutionId: payload.nodeExecutionId });

          const cropped = await readFile(outputPath);

          // Wait token = native checkpoint/restore wait (no polling): the task
          // suspends here, freeing its resources, and resumes only when
          // /api/transloadit/webhook completes the token from Transloadit's
          // own callback — instead of re-checking assembly status every 1s.
          const token = await wait.createToken({ timeout: "2m" });
          const notifyUrl = `${serverEnv().APP_URL}/api/transloadit/webhook?token=${token.id}`;
          logger.info("[crop] starting Transloadit upload", { nodeExecutionId: payload.nodeExecutionId, notifyUrl });
          await startTransloaditUpload(cropped, "crop.png", notifyUrl);

          logger.info("[crop] waiting on Transloadit webhook token", { nodeExecutionId: payload.nodeExecutionId, tokenId: token.id });
          const result = await wait.forToken<TransloaditWebhookResult>(token);
          if (!result.ok) {
            logger.error("[crop] Transloadit webhook wait timed out", { nodeExecutionId: payload.nodeExecutionId, error: result.error.message });
            throw new Error(`Transloadit webhook timed out: ${result.error.message}`);
          }
          if ("error" in result.output) {
            logger.error("[crop] Transloadit assembly failed", { nodeExecutionId: payload.nodeExecutionId, error: result.output.error });
            throw new Error(`Transloadit assembly failed: ${result.output.error}`);
          }
          logger.info("[crop] upload complete", { nodeExecutionId: payload.nodeExecutionId, url: result.output.url });
          return { url: result.output.url };
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      },
      (output) => ({ url: output.url }),
    );
  },
});
