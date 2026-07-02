"use client";

import type { NodeProps } from "@xyflow/react";
import { AlignLeft, Check, Copy, GripVertical, Hash, Image as ImageIcon, Info, Maximize2, Plus, SquareCheck, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { getNodeSpec, type RequestField, type RequestInputsConfig } from "@/domain/nodes";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { UnsupportedImageTypeError, uploadImage } from "@/lib/uploadImage";
import { useWorkflowStore, type NextFlowNode } from "@/store/workflow-store";
import { NodeInfoButton, NodeShell, PortRow } from "./NodeShell";

const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.map((ext) => `.${ext}`).join(",");

const FIELD_TYPE_MENU: { type: RequestField["type"]; label: string; icon: typeof AlignLeft }[] = [
  { type: "text_field", label: "Text", icon: AlignLeft },
  { type: "number_field", label: "Number", icon: Hash },
  { type: "boolean_field", label: "Boolean", icon: SquareCheck },
  { type: "image_field", label: "Image", icon: ImageIcon },
];

const FIELD_TYPE_INFO: Record<RequestField["type"], string> = {
  text_field: "A text value supplied when this workflow runs via the API or Playground.",
  number_field: "A numeric value supplied when this workflow runs via the API or Playground.",
  boolean_field: "A true/false value supplied when this workflow runs via the API or Playground.",
  image_field: "An image supplied when this workflow runs via the API or Playground.",
};

/** Same small (i)-button + popover pattern as ParamRow's info icon. */
function FieldInfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, open, () => setOpen(false));

  return (
    <div ref={rootRef} className="nodrag relative shrink-0">
      <button
        type="button"
        aria-label="Field info"
        data-testid="request-inputs-field-info-button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-4 w-4 items-center justify-center text-label-muted hover:text-text-muted"
      >
        <Info size={12} />
      </button>
      {open && (
        <div
          data-testid="request-inputs-field-info-popover"
          className="absolute left-0 top-full z-20 mt-1 w-[220px] rounded-card border border-card-border bg-card-bg p-2 text-xs text-text-muted shadow-card"
        >
          {text}
        </div>
      )}
    </div>
  );
}

/** Header "+" button — replaces the "•••" menu on Request-Inputs only (docs/prompts/request-inputs-add-menu.md). */
function AddFieldMenu({ onAdd }: { onAdd: (type: RequestField["type"]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(rootRef, open, () => setOpen(false));

  return (
    <div ref={rootRef} className="nodrag relative shrink-0">
      <button
        type="button"
        aria-label="Add field"
        data-testid="request-inputs-add-button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-card-border text-zinc-600 hover:bg-control-hover"
      >
        <Plus size={16} />
      </button>
      {open && (
        <div
          data-testid="request-inputs-add-menu"
          className="absolute left-full top-0 z-20 ml-2 w-[140px] rounded-xl border border-card-border bg-white py-1 shadow-card-hover"
        >
          {FIELD_TYPE_MENU.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              data-testid="request-inputs-add-menu-item"
              data-field-type={type}
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-strong hover:bg-zinc-50"
            >
              <Icon size={14} className="text-text-muted" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Field name renders as static text; double-click swaps in an editable input (docs/prompts/model-and-crop-nodes.md §6). */
function FieldNameLabel({
  name,
  autoFocus,
  onRename,
}: {
  name: string;
  autoFocus: boolean;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(name);

  if (!editing) {
    return (
      <span
        onDoubleClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        data-testid="request-inputs-field-name"
        className="min-w-0 truncate rounded px-2 py-1 text-[13px] font-medium text-text-strong"
      >
        {name}
      </span>
    );
  }

  function commit() {
    setEditing(false);
    if (draft.trim() && draft !== name) onRename(draft.trim());
  }

  return (
    <input
      value={draft}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      data-testid="request-inputs-field-name-input"
      className="flex-1 rounded bg-canvas-bg px-2 py-1 text-[13px] font-medium text-text-strong"
    />
  );
}

/** Copies only the field's own value to the clipboard, with the standard Copy→Check "Copied" feedback (see ApiTab.tsx's copySnippet). */
function FieldCopyButton({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy value"
      data-testid="request-inputs-field-copy"
      className={copied ? "text-green-600" : "text-label-muted hover:text-text-strong"}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/**
 * text_field's textarea — subtle zinc-100 fill with no border (not a harsh
 * box), plus a bottom-right expand button that grows the visible row count
 * for editing longer prompts without needing the browser's native resize
 * handle.
 */
function TextFieldTextarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative pl-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text…"
        rows={expanded ? 6 : 2}
        data-testid="text-field-input"
        className="w-full resize-y rounded-lg border-none bg-zinc-100 px-2 py-1.5 pr-6 text-[13px] text-text-strong placeholder:font-normal placeholder:text-zinc-400 focus:outline-none"
      />
      <button
        type="button"
        aria-label={expanded ? "Collapse text field" : "Expand text field"}
        data-testid="text-field-expand"
        onClick={() => setExpanded((e) => !e)}
        className="absolute bottom-2 right-1 flex h-4 w-4 items-center justify-center text-label-muted hover:text-text-strong"
      >
        <Maximize2 size={11} />
      </button>
    </div>
  );
}

export function RequestInputsNode({ id, data, selected }: NodeProps<NextFlowNode>) {
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const removeRequestInputsField = useWorkflowStore((s) => s.removeRequestInputsField);
  const config = data.config as RequestInputsConfig;
  const spec = getNodeSpec("request-inputs");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastAddedFieldId, setLastAddedFieldId] = useState<string | null>(null);

  // Each updater reads the *latest* config at apply time (not this render's
  // closure) — two field additions fired before a re-render would otherwise
  // both compute against the same stale fields array and the second would
  // silently drop the first.
  function addField(type: RequestField["type"]) {
    const newId = crypto.randomUUID();
    updateNodeConfig(id, (current) => {
      const fields = (current as RequestInputsConfig).fields;
      const count = fields.filter((f) => f.type === type).length + 1;
      return { ...current, fields: [...fields, { id: newId, name: `${type}_${count}`, type, value: null }] };
    });
    setLastAddedFieldId(newId);
  }

  // Also removes any edges sourced from this field — otherwise a deleted
  // field leaves a dangling edge, and every connected param it fed (Crop's
  // X/Y/Width/Height, Gemini's Settings ports) stays stuck showing "connected".
  function removeField(fieldId: string) {
    removeRequestInputsField(id, fieldId);
  }

  function renameField(fieldId: string, name: string) {
    updateNodeConfig(id, (current) => ({
      ...current,
      fields: (current as RequestInputsConfig).fields.map((f) => (f.id === fieldId ? { ...f, name } : f)),
    }));
  }

  function setFieldValue(fieldId: string, value: string | null) {
    updateNodeConfig(id, (current) => ({
      ...current,
      fields: (current as RequestInputsConfig).fields.map((f) => (f.id === fieldId ? { ...f, value } : f)),
    }));
  }

  async function handleImageUpload(fieldId: string, file: File) {
    setUploadError(null);
    setUploading(fieldId);
    try {
      const url = await uploadImage(file);
      setFieldValue(fieldId, url);
    } catch (error) {
      setUploadError(
        error instanceof UnsupportedImageTypeError ? error.message : "Upload failed — please try again.",
      );
    } finally {
      setUploading(null);
    }
  }

  return (
    <NodeShell
      id={id}
      kind="request-inputs"
      label="Request-Inputs"
      status={data.status}
      selected={selected}
      executable={spec.executable}
      deletable={spec.deletable}
      description={spec.description}
      locked={data.locked}
      headerLeftExtra={<NodeInfoButton description={spec.description} />}
      headerRight={<AddFieldMenu onAdd={addField} />}
    >
      {config.fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center gap-1.5">
            <GripVertical size={14} className="shrink-0 cursor-grab text-label-muted" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <FieldNameLabel
                name={field.name}
                autoFocus={field.id === lastAddedFieldId}
                onRename={(name) => renameField(field.id, name)}
              />
              <FieldInfoButton text={FIELD_TYPE_INFO[field.type]} />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <FieldCopyButton value={field.value} />
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="text-label-muted hover:text-red-500"
                aria-label={`Remove ${field.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <PortRow
              port={{ id: field.id, label: "", type: field.type === "image_field" ? "image" : "text" }}
              direction="output"
            />
          </div>

          {field.type === "text_field" && (
            <TextFieldTextarea
              value={field.value ?? ""}
              onChange={(value) => setFieldValue(field.id, value)}
            />
          )}

          {field.type === "number_field" && (
            <div className="pl-3">
              <input
                type="number"
                value={field.value ?? "0"}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                data-testid="number-field-input"
                className="w-full rounded-lg border-none bg-zinc-100 px-2 py-1.5 text-[13px] text-text-strong focus:outline-none"
              />
            </div>
          )}

          {field.type === "image_field" && (
            <div className="pl-3">
              {field.value ? (
                <div className="relative h-10 w-10">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote CDN thumbnail, not worth next/image config here */}
                  <img
                    src={field.value}
                    alt={field.name}
                    data-testid="image-field-preview"
                    className="h-10 w-10 rounded object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    data-testid="image-field-clear"
                    onClick={() => setFieldValue(field.id, null)}
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-900"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <label className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-card-border px-2 py-1.5 text-xs text-text-muted hover:bg-control-hover">
                  <Upload size={12} />
                  {uploading === field.id ? "Uploading…" : "Upload Image"}
                  <input
                    type="file"
                    accept={ACCEPT_ATTR}
                    data-testid="image-field-input"
                    className="hidden"
                    disabled={uploading === field.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleImageUpload(field.id, file);
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      ))}

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
    </NodeShell>
  );
}
