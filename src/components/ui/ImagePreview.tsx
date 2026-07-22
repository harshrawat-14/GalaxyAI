"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut } from "lucide-react";

/**
 * A thumbnail that opens a full-screen "Quick Look" lightbox when clicked —
 * the same picture, large, dimmed backdrop, closable via the X, a backdrop
 * click, or Escape, with a click-to-zoom toggle (fit <-> actual size).
 *
 * The overlay is rendered through a portal to `document.body` on purpose:
 * React Flow applies a CSS `transform: scale()` to the canvas, and a
 * `position: fixed` element inside a transformed ancestor is sized/positioned
 * relative to that transform (so at 40% zoom a "full-screen" overlay shrinks
 * into the node). Portalling to the body escapes the transform, so the
 * lightbox is truly viewport-sized regardless of canvas zoom.
 *
 * `nodrag`/`nopan` + stopPropagation keep the thumbnail click from starting a
 * React Flow node drag or canvas pan.
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
  const [zoomed, setZoomed] = useState(false);

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
    setZoomed(false); // always start "fit"
    setOpen(true);
  }

  const lightbox =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            data-testid={testId ? `${testId}-lightbox` : "image-lightbox"}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[2000] flex items-center justify-center overflow-auto bg-black/85 p-6 backdrop-blur-sm"
          >
            <div className="absolute right-4 top-4 flex gap-2">
              <button
                type="button"
                aria-label={zoomed ? "Fit to screen" : "Zoom in"}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomed((z) => !z);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <button
                type="button"
                aria-label="Close preview"
                data-testid="image-lightbox-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN image, not worth next/image config here */}
            <img
              src={src}
              alt={alt}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
              className={
                zoomed
                  ? "max-w-none cursor-zoom-out rounded-lg shadow-2xl"
                  : "max-h-[90vh] max-w-[92vw] cursor-zoom-in rounded-lg object-contain shadow-2xl"
              }
            />
          </div>,
          document.body,
        )
      : null;

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
      {lightbox}
    </>
  );
}
