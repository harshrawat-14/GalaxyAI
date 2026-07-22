"use client";

import type { NodeProps } from "@xyflow/react";
import { Info, Plus, Upload, X } from "lucide-react";
import { useState } from "react";
import { SliderParam, OutputBox } from "@/components/canvas/controls";
import { ImagePreview } from "@/components/ui/ImagePreview";
import { getNodeSpec, type CropImageConfig } from "@/domain/nodes";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { estimateNodeTokens, formatM } from "@/lib/estimates";
import { UnsupportedImageTypeError, uploadImage } from "@/lib/uploadImage";
import { useWorkflowStore, type NextFlowNode } from "@/store/workflow-store";
import { NodeShell, PortRow } from "./NodeShell";

const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.map((ext) => `.${ext}`).join(",");

const PERCENT_FIELDS: { key: "x" | "y" | "width" | "height"; label: string }[] = [
  { key: "x", label: "X Position (%)" },
  { key: "y", label: "Y Position (%)" },
  { key: "width", label: "Width (%)" },
  { key: "height", label: "Height (%)" },
];

const DEFAULTS: Record<"x" | "y" | "width" | "height", number> = { x: 0, y: 0, width: 100, height: 100 };

export function CropImageNode({ id, data, selected }: NodeProps<NextFlowNode>) {
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const edges = useWorkflowStore((s) => s.edges);
  const addRequestInputsFieldAndConnect = useWorkflowStore((s) => s.addRequestInputsFieldAndConnect);
  const config = data.config as CropImageConfig;
  const spec = getNodeSpec("crop-image");
  const inputImagePort = spec.inputs(config)[0];
  const outputImagePort = spec.outputs(config)[0];
  const isConnected = edges.some((e) => e.target === id && e.targetHandle === "input_image");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Realtime output is keyed by output port id (e.g. "output_image"), not a fixed "url" field.
  const output = data.output as Record<string, unknown> | undefined;
  const outputUrl = outputImagePort ? (output?.[outputImagePort.id] as string | undefined) : undefined;

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      updateNodeConfig(id, { imageUrl: url });
    } catch (error) {
      setUploadError(error instanceof UnsupportedImageTypeError ? error.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <NodeShell
      id={id}
      kind="crop-image"
      label="Crop Image"
      status={data.status}
      selected={selected}
      executable={spec.executable}
      deletable={spec.deletable}
      description={spec.description}
      locked={data.locked}
      width="w-[340px]"
    >
      {inputImagePort && (
        <div>
          <PortRow
            port={inputImagePort}
            direction="input"
            connected={isConnected}
            rightExtra={
              config.imageUrl ? (
                // Sized to actually show the picture; a 24px square read as
                // "no preview". Stays inside the port row (rather than moving
                // to its own block) so React Flow's handle measurement is
                // untouched — see the Request-Inputs Reorder regression.
                <div className="relative h-10 w-10">
                  <ImagePreview
                    src={config.imageUrl}
                    testId="crop-input-image-preview"
                    className="h-10 w-10 rounded border border-card-border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    data-testid="crop-input-image-clear"
                    onClick={() => updateNodeConfig(id, { imageUrl: null })}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800/90 text-white hover:bg-zinc-900"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-card-border px-2 py-1 text-xs text-text-muted hover:bg-control-hover">
                  <Upload size={12} />
                  {uploading ? "Uploading…" : "Upload Image"}
                  <input
                    type="file"
                    accept={ACCEPT_ATTR}
                    data-testid="crop-input-image-input"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleUpload(file);
                    }}
                  />
                </label>
              )
            }
            addButton={
              !isConnected ? (
                <button
                  type="button"
                  aria-label="Add an image field on Request-Inputs and connect it here"
                  data-testid="crop-input-image-quick-add"
                  onClick={() => addRequestInputsFieldAndConnect(id, "input_image", "image_field")}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-card-border text-text-muted hover:bg-control-hover"
                >
                  <Plus size={14} />
                </button>
              ) : undefined
            }
          />
          <p
            className={`pl-3 mt-1 flex items-center gap-1 text-[11px] text-label-muted ${
              isConnected ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Info size={10} /> Upload requirements
          </p>
          {uploadError && <p className="pl-3 text-xs text-red-500">{uploadError}</p>}
        </div>
      )}

      {PERCENT_FIELDS.map(({ key, label }) => {
        const percentConnected = edges.some((e) => e.target === id && e.targetHandle === key);
        return (
          <SliderParam
            key={key}
            label={label}
            portId={key}
            connected={percentConnected}
            value={config[key]}
            min={0}
            max={100}
            step={1}
            onChange={(value) => updateNodeConfig(id, { [key]: value })}
            onReset={() => updateNodeConfig(id, { [key]: DEFAULTS[key] })}
            onAdd={() => addRequestInputsFieldAndConnect(id, key, "number_field")}
          />
        );
      })}

      <div className="space-y-1">
        <span className="text-[13px] text-text-strong">Output Image</span>
        <OutputBox testId="crop-output-image">
          {outputUrl ? (
            <ImagePreview src={outputUrl} className="mx-auto h-16 rounded object-contain" />
          ) : undefined}
        </OutputBox>
        {outputImagePort && <PortRow port={outputImagePort} direction="output" />}
      </div>

      <div className="flex items-center justify-end gap-1 pt-1 text-[11px] text-label-muted">
        {formatM(estimateNodeTokens({ kind: "crop-image", config }))}
        <Info size={10} />
      </div>
    </NodeShell>
  );
}
