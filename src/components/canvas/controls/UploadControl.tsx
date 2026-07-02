"use client";

import { Info, Upload } from "lucide-react";

/**
 * Presentation for the Transloadit image upload flow, reused by Request-Inputs'
 * image_field, Gemini's Image (Vision) input, and Crop's Input Image — the
 * actual upload call (`uploadImage` from `@/lib/uploadImage`) stays with each
 * caller, which owns its own loading/error state and passes them in here.
 */
export function UploadControl({
  value,
  uploading,
  accept,
  onUpload,
  testId,
}: {
  value: string | null;
  uploading: boolean;
  accept: string;
  onUpload: (file: File) => void;
  testId?: string;
}) {
  return (
    <div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN thumbnail, not worth next/image config here
        <img src={value} alt="" data-testid={testId ? `${testId}-preview` : undefined} className="h-10 w-10 rounded object-cover" />
      ) : (
        <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-card-border px-3 py-2 text-xs text-text-muted hover:bg-control-hover">
          <Upload size={14} />
          {uploading ? "Uploading…" : "Upload Image"}
          <input
            type="file"
            accept={accept}
            data-testid={testId ? `${testId}-input` : undefined}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
      <p className="mt-1 flex items-center gap-1 text-[11px] text-label-muted">
        <Info size={10} /> Upload requirements
      </p>
    </div>
  );
}
