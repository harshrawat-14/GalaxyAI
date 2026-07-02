"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { NodeKind } from "@/domain/nodes";
import type { WorkflowStatus } from "@/domain/types";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { UnsupportedImageTypeError, uploadImage } from "@/lib/uploadImage";

export interface WorkflowSummary {
  id: string;
  name: string;
  status: WorkflowStatus;
  updatedAt: string;
  nodeCount: number;
  nodeKinds: NodeKind[];
  coverImageUrl: string | null;
}

const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.map((ext) => `.${ext}`).join(",");

/** Relative for under a day ("last edited 42 min ago" / "...4 hours 2 minutes ago"), else an absolute date. */
function formatLastEdited(updatedAt: string): string {
  const updated = new Date(updatedAt);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 60_000));

  if (diffMinutes < 60) return `Last edited ${diffMinutes} min ago`;

  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    const minutes = diffMinutes % 60;
    const hoursPart = `${hours} hour${hours === 1 ? "" : "s"}`;
    return minutes > 0 ? `Last edited ${hoursPart} ${minutes} minute${minutes === 1 ? "" : "s"} ago` : `Last edited ${hoursPart} ago`;
  }

  return updated.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_DOT: Record<WorkflowStatus, string> = {
  idle: "bg-divider",
  running: "bg-run animate-pulse",
};

// By each kind's representative port type, from docs/UI_PARITY_FIXES.md's type palette.
const KIND_DOT: Record<NodeKind, string> = {
  "request-inputs": "bg-type-file",
  "crop-image": "bg-type-image",
  gemini: "bg-type-text",
  response: "bg-type-result",
};

/** Same outside-click + Escape pattern as NodeShell.tsx's NodeHeaderControls/NodeInfoButton. */
function WorkflowCardMenu({
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Workflow options"
        data-testid="workflow-card-menu-button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[rgba(255,255,255,0.95)] text-[#4B5563] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-colors duration-150 hover:bg-[#F9FAFB]"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          data-testid="workflow-card-menu"
          className="absolute right-0 top-full z-20 mt-2 w-[190px] rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
        >
          <button
            type="button"
            data-testid="workflow-card-menu-open"
            onClick={(e) => {
              e.preventDefault();
              run(onOpen);
            }}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <ExternalLink size={15} className="text-[#374151]" /> Open
          </button>
          <button
            type="button"
            data-testid="workflow-card-menu-rename"
            onClick={(e) => {
              e.preventDefault();
              run(onRename);
            }}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <Pencil size={15} className="text-[#374151]" /> Rename
          </button>
          <button
            type="button"
            data-testid="workflow-card-menu-duplicate"
            onClick={(e) => {
              e.preventDefault();
              run(onDuplicate);
            }}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <Copy size={15} className="text-[#374151]" /> Duplicate
          </button>
          <button
            type="button"
            data-testid="workflow-card-menu-export"
            onClick={(e) => {
              e.preventDefault();
              run(onExport);
            }}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <Download size={15} className="text-[#374151]" /> Export JSON
          </button>
          <button
            type="button"
            data-testid="workflow-card-menu-delete"
            onClick={(e) => {
              e.preventDefault();
              run(onDelete);
            }}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
          >
            <Trash2 size={15} className="text-[#DC2626]" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** Fixed-position centered popup (no existing modal component to reuse) — closes on backdrop click or Escape. */
function CoverImagePopup({
  onClose,
  onUpload,
  error,
}: {
  onClose: () => void;
  onUpload: (file: File) => void;
  error: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="cover-image-popup-backdrop"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        data-testid="cover-image-popup"
        onClick={(e) => e.stopPropagation()}
        className="w-[460px] rounded-[32px] border border-[#E5E7EB] bg-[#FFFFFF] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
      >
        <p className="text-[18px] font-medium text-[#374151]">Add a file from your device or select one from your library</p>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            aria-label="Select asset (not yet wired)"
            data-testid="cover-image-select-asset"
            // TODO: wire to the asset library once one exists. Visual parity only.
            onClick={() => {}}
            className="flex h-[72px] w-full items-center justify-center gap-2 rounded-[20px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:bg-[#F9FAFB]"
          >
            <ImagePlus size={20} /> Select Asset
          </button>
          <button
            type="button"
            data-testid="cover-image-upload"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-[72px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#4F46E5] text-[#FFFFFF] hover:bg-[#4338CA]"
          >
            <Upload size={20} /> Upload
          </button>
          <input
            ref={fileInputRef}
            data-testid="cover-image-upload-input"
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard card with a lightweight thumbnail (parity fix #2), now optionally
 * a real cover image (docs/prompts/flow-homepage.md Task 5) instead of the
 * dot-grid placeholder. Hover reveals a cover-image button (top-left) and a
 * "..." menu (top-right) over the thumbnail; the menu's Rename reuses the
 * existing inline rename-input flow below instead of a separate dialog.
 */
export function WorkflowCard({
  workflow,
  onRename,
  onDelete,
  onDuplicate,
  onExport,
  onCoverImageChange,
}: {
  workflow: WorkflowSummary;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onCoverImageChange: (id: string, coverImageUrl: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workflow.name);
  const [coverPopupOpen, setCoverPopupOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function commitRename() {
    setEditing(false);
    if (name.trim() && name !== workflow.name) onRename(workflow.id, name.trim());
    else setName(workflow.name);
  }

  async function handleCoverUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onCoverImageChange(workflow.id, url);
      setCoverPopupOpen(false);
    } catch (error) {
      setUploadError(error instanceof UnsupportedImageTypeError ? error.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      data-testid="workflow-row"
      data-workflow-id={workflow.id}
      data-workflow-status={workflow.status}
      className="group rounded-card border border-card-border bg-card-bg shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="relative h-28 w-full">
        {/* overflow-hidden lives here (not on the card root) so the "..."
            menu dropdown below — an absolutely positioned sibling of this
            Link — isn't clipped to the thumbnail's rounded corners. */}
        <Link
          href={`/workflow/${workflow.id}`}
          data-testid="workflow-open-link"
          className="block overflow-hidden rounded-t-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN cover image (or the bundled default), not worth next/image config here */}
          <img
            src={workflow.coverImageUrl ?? "/default-workflow-cover.png"}
            alt=""
            data-testid="workflow-cover-image"
            className="h-28 w-full object-cover"
          />
          {!workflow.coverImageUrl && (
            <>
              <div className="absolute bottom-2 left-2 flex gap-1">
                {workflow.nodeKinds.map((kind) => (
                  <span key={kind} className={`h-2.5 w-2.5 rounded-full ${KIND_DOT[kind]} ring-1 ring-white/70`} />
                ))}
              </div>
              <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                {workflow.nodeCount} {workflow.nodeCount === 1 ? "node" : "nodes"}
              </span>
            </>
          )}
        </Link>

        <button
          type="button"
          aria-label="Set cover image"
          data-testid="workflow-cover-image-button"
          onClick={(e) => {
            e.preventDefault();
            setCoverPopupOpen(true);
          }}
          className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[rgba(255,255,255,0.95)] text-[#4B5563] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-colors duration-150 hover:bg-[#F9FAFB] group-hover:opacity-100"
        >
          <ImagePlus size={20} />
        </button>
        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <WorkflowCardMenu
            onOpen={() => router.push(`/workflow/${workflow.id}`)}
            onRename={() => setEditing(true)}
            onDuplicate={() => onDuplicate(workflow.id)}
            onExport={() => onExport(workflow.id)}
            onDelete={() => onDelete(workflow.id)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            data-testid="workflow-status-badge"
            className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[workflow.status]}`}
          />
          {editing ? (
            <input
              autoFocus
              data-testid="workflow-rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
              className="min-w-0 rounded bg-canvas-bg px-2 py-1 text-sm text-text-strong"
            />
          ) : (
            <Link href={`/workflow/${workflow.id}`} className="truncate text-sm text-text-strong hover:underline">
              {workflow.name}
            </Link>
          )}
        </div>

        {editing && (
          <div className="flex shrink-0 items-center gap-2 text-label-muted">
            <button type="button" onClick={commitRename} aria-label="Save name" className="hover:text-emerald-500">
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setName(workflow.name);
                setEditing(false);
              }}
              aria-label="Cancel rename"
              className="hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      <p className="px-3 pb-2.5 text-xs text-label-muted">{formatLastEdited(workflow.updatedAt)}</p>

      {coverPopupOpen && (
        <CoverImagePopup
          onClose={() => !uploading && setCoverPopupOpen(false)}
          onUpload={handleCoverUpload}
          error={uploadError}
        />
      )}
    </div>
  );
}
