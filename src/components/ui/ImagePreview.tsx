"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { X } from "lucide-react";

/**
 * A thumbnail that opens a full-screen "Quick Look" lightbox when clicked —
 * the same picture, large, dimmed backdrop, closable via the X, a backdrop
 * click, or Escape. Used for every uploaded/produced image preview
 * (request-inputs, crop in/out, Gemini vision, Response result, run history)
 * so they all zoom the same way.
 *
 * `nodrag`/`nopan` + stopPropagation keep the click from starting a React Flow
 * node drag or canvas pan when the preview lives inside a node.
 */
export function ImagePreview({
  src,
  alt = "",
  className,
  testId,
}: {
  src: string;
  alt?: string;
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openLightbox(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN image, not worth next/image config here */}
      <img
        src={src}
        alt={alt}
        data-testid={testId}
        onClick={openLightbox}
        className={`nodrag nopan cursor-zoom-in ${className ?? ""}`}
      />

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid={testId ? `${testId}-lightbox` : "image-lightbox"}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-8"
        >
          <button
            type="button"
            aria-label="Close preview"
            data-testid="image-lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN image, not worth next/image config here */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
