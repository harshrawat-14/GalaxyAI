import {
  external_exports
} from "./chunk-PHDSVARJ.mjs";
import {
  logger,
  task
} from "./chunk-KLFD6HWA.mjs";
import {
  __name,
  init_esm
} from "./chunk-OOYLPNSB.mjs";

// src/trigger/extract-frame-task.ts
init_esm();
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var TMP = "/tmp/nextflow-extract";
var ExtractFrameSchema = external_exports.object({
  videoUrl: external_exports.string().min(1),
  timestamp: external_exports.string(),
  nodeRunId: external_exports.string()
});
var extractFrameTask = task({
  id: "extract-frame-ffmpeg",
  run: /* @__PURE__ */ __name(async (payload) => {
    const { videoUrl, timestamp, nodeRunId } = payload;
    await logger.info("Starting frame extraction", { nodeRunId, timestamp });
    if (videoUrl.startsWith("blob:")) {
      throw new Error(
        "Video has not been uploaded to the server yet. Re-add the video after upload completes."
      );
    }
    const ffmpegBin = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
    await mkdir(TMP, { recursive: true });
    const id = randomBytes(8).toString("hex");
    const vidPath = join(TMP, `${id}.mp4`);
    const frmPath = join(TMP, `${id}.jpg`);
    let vidBuf;
    if (videoUrl.startsWith("data:")) {
      vidBuf = Buffer.from(videoUrl.split(",")[1] ?? "", "base64");
    } else {
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error(`Failed to fetch source video (${res.status})`);
      vidBuf = Buffer.from(await res.arrayBuffer());
    }
    await writeFile(vidPath, vidBuf);
    let seekTime = timestamp.replace(/s$/i, "").trim();
    if (timestamp.endsWith("%")) {
      const pct = parseFloat(timestamp) / 100;
      const { stdout } = await execAsync(
        `"${ffmpegBin}" -v error -show_entries format=duration -of csv=p=0 "${vidPath}"`
      ).catch(() => ({ stdout: "0" }));
      const dur = parseFloat(stdout.trim()) || 0;
      seekTime = String((dur * pct).toFixed(2));
    }
    try {
      await execAsync(
        `"${ffmpegBin}" -ss ${seekTime} -i "${vidPath}" -frames:v 1 -q:v 2 "${frmPath}" -y`
      );
      const frameBuf = await readFile(frmPath);
      const resultUrl = `data:image/jpeg;base64,${frameBuf.toString("base64")}`;
      await logger.info("Frame extraction complete", { nodeRunId, seekTime });
      return { resultUrl, nodeRunId };
    } finally {
      await Promise.allSettled([unlink(vidPath), unlink(frmPath)]);
    }
  }, "run")
});

export {
  extractFrameTask
};
//# sourceMappingURL=chunk-GS52ZZL7.mjs.map
