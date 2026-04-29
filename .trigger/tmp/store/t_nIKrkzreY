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

// src/trigger/crop-image-task.ts
init_esm();
var CropInputSchema = external_exports.object({
  imageUrl: external_exports.string().min(1),
  xPercent: external_exports.number().min(0).max(100),
  yPercent: external_exports.number().min(0).max(100),
  widthPercent: external_exports.number().min(0).max(100),
  heightPercent: external_exports.number().min(0).max(100),
  nodeRunId: external_exports.string()
});
var cropImageTask = task({
  id: "crop-image-ffmpeg",
  run: /* @__PURE__ */ __name(async (payload) => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent, nodeRunId } = payload;
    await logger.info("Starting image crop", {
      nodeRunId,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent
    });
    if (xPercent + widthPercent > 100 || yPercent + heightPercent > 100) {
      throw new Error(
        `Crop window out of bounds: X%${xPercent}+W%${widthPercent}=${xPercent + widthPercent} or Y%${yPercent}+H%${heightPercent}=${yPercent + heightPercent} exceeds 100%. Reduce X%, Y%, or width/height so the crop fits inside the image.`
      );
    }
    let imgBuf;
    if (imageUrl.startsWith("data:")) {
      imgBuf = Buffer.from(imageUrl.split(",")[1] ?? "", "base64");
    } else {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to fetch source image (${res.status})`);
      imgBuf = Buffer.from(await res.arrayBuffer());
    }
    const sharp = (await import("sharp")).default;
    const img = sharp(imgBuf);
    const { width = 100, height = 100, format = "jpeg" } = await img.metadata();
    const left = Math.max(0, Math.min(width - 1, Math.round(width * xPercent / 100)));
    const top = Math.max(0, Math.min(height - 1, Math.round(height * yPercent / 100)));
    const cw = Math.max(1, Math.min(width - left, Math.round(width * widthPercent / 100)));
    const ch = Math.max(1, Math.min(height - top, Math.round(height * heightPercent / 100)));
    const cropped = await img.extract({ left, top, width: cw, height: ch }).toBuffer();
    const resultUrl = `data:image/${format};base64,${cropped.toString("base64")}`;
    await logger.info("Image crop complete", { nodeRunId });
    return { resultUrl, nodeRunId };
  }, "run")
});

export {
  cropImageTask
};
//# sourceMappingURL=chunk-NW2TI7VC.mjs.map
