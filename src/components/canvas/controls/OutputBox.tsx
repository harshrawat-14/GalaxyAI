"use client";

import type { ReactNode } from "react";

/** Reused by Gemini's Response, Crop's Output Image, and the Response node's result boxes. */
export function OutputBox({ children, testId }: { children?: ReactNode; testId?: string }) {
  const hasContent = children !== undefined && children !== null && children !== "";
  return (
    <div
      data-testid={testId}
      className="flex min-h-[64px] items-center justify-center rounded-[10px] border border-card-border bg-white p-3 text-xs"
    >
      {hasContent ? <div className="w-full text-text-muted">{children}</div> : <p className="text-label-muted">No output yet</p>}
    </div>
  );
}
