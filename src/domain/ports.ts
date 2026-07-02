/**
 * Port type system.
 *
 * Edges are validated against these types so an image output can never be wired
 * into a text input. This is the single source of truth for connection
 * compatibility — the canvas, the API, and the execution engine all defer to it.
 */

export const PORT_TYPES = ["text", "image", "video", "audio", "file", "any"] as const;
export type PortType = (typeof PORT_TYPES)[number];

export interface PortDef {
  /** Stable handle id, unique within the node (e.g. "prompt", "input_image"). */
  id: string;
  /** Human label shown on the node. */
  label: string;
  /** Data type carried by this handle. */
  type: PortType;
  /** Required inputs block execution until satisfied (connection or manual value). */
  required?: boolean;
  /** Allow many incoming connections on one handle (e.g. Gemini vision). */
  multiple?: boolean;
}

/**
 * Can a value produced by `source` flow into a handle expecting `target`?
 * `any` is the top type: it accepts and is accepted by everything. Otherwise
 * types must match exactly. Centralizing this keeps Liskov substitution honest —
 * adding a new PortType only requires updating this one predicate.
 */
export function isCompatible(source: PortType, target: PortType): boolean {
  if (source === "any" || target === "any") return true;
  return source === target;
}
