"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Collapsible "> Settings" section — `open` is controlled so it can persist in node config. */
export function SettingsSection({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="nodrag">
      <button
        type="button"
        onClick={onToggle}
        data-testid="settings-section-toggle"
        aria-expanded={open}
        className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-strong"
      >
        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        Settings
      </button>
      {open && <div data-testid="settings-section-body" className="mt-2 space-y-2.5">{children}</div>}
    </div>
  );
}
