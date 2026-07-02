import type { NodeTypes } from "@xyflow/react";
import { STICKY_NOTE_TYPE } from "@/store/workflow-store";
import { CropImageNode } from "./CropImageNode";
import { GeminiNode } from "./GeminiNode";
import { RequestInputsNode } from "./RequestInputsNode";
import { ResponseNode } from "./ResponseNode";
import { StickyNoteNode } from "./StickyNoteNode";

/** One entry per node kind — the only place a 5th kind's component is registered. */
export const NODE_COMPONENTS: NodeTypes = {
  "request-inputs": RequestInputsNode,
  "crop-image": CropImageNode,
  gemini: GeminiNode,
  response: ResponseNode,
  [STICKY_NOTE_TYPE]: StickyNoteNode,
};
