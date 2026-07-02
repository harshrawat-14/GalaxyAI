"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Boxes,
  FolderOpen,
  Library,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Split,
  Workflow,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

interface WorkflowSummary {
  id: string;
  name: string;
}

function PlaceholderRow({
  icon: Icon,
  label,
  testId,
  collapsed,
}: {
  icon: typeof FolderOpen;
  label: string;
  testId: string;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled="true"
      data-testid={testId}
      className={`flex h-10 w-full items-center gap-2 rounded-lg text-[14px] font-medium text-[#3F3F46] hover:bg-control-hover ${
        collapsed ? "justify-center" : "px-2.5"
      }`}
    >
      <Icon size={20} className="shrink-0 text-text-muted" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

/**
 * Left sidebar — full reference nav row set (New task / Search Task / Task /
 * Projects / Library / Flow / Tools / API-MCP). Only the rows NextFlow
 * actually has a feature for are wired up (New task -> new workflow, Search
 * Task -> workflow search, Flow -> dashboard); the rest render as inert
 * placeholders (icon + label, no onClick) rather than dead links, same
 * pattern as the existing Settings row.
 */
export function CanvasSidebar() {
  const router = useRouter();
  const collapsed = useWorkflowStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useWorkflowStore((s) => s.toggleSidebarCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    fetch("/api/workflows")
      .then((res) => res.json())
      .then((list: WorkflowSummary[]) => setWorkflows(list));
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [searchOpen]);

  async function createWorkflow() {
    const res = await fetch("/api/workflows", { method: "POST" });
    const { id } = await res.json();
    router.push(`/workflow/${id}/edit`);
  }

  const filtered = workflows.filter((w) => w.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-card-border bg-sidebar-bg transition-all duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`flex items-center gap-2 px-3 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-run text-white">
              <Workflow size={16} />
            </div>
            <span className="truncate text-sm font-semibold text-text-strong">NextFlow</span>
          </div>
        )}
        {collapsed ? (
          // Collapsed: the logo sits here by default; hovering swaps it for
          // the same expand control as the wide sidebar's toggle button.
          <div className="group relative flex h-7 w-7 shrink-0 items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-run text-white transition-opacity group-hover:opacity-0">
              <Workflow size={16} />
            </div>
            <button
              type="button"
              aria-label="Expand sidebar"
              data-testid="canvas-sidebar-toggle"
              onClick={toggleCollapsed}
              className="absolute inset-0 flex items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-control-hover group-hover:opacity-100"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Collapse sidebar"
            data-testid="canvas-sidebar-toggle"
            onClick={toggleCollapsed}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-control-hover"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2">
        <button
          type="button"
          aria-label="New task"
          data-testid="sidebar-new-workflow"
          onClick={createWorkflow}
          className={`flex h-10 w-full items-center gap-2 rounded-lg text-[14px] font-medium text-[#3F3F46] hover:bg-control-hover ${
            collapsed ? "justify-center" : "px-2.5"
          }`}
        >
          <Plus size={20} className="shrink-0 text-text-muted" />
          {!collapsed && <span className="truncate">New task</span>}
        </button>

        <div ref={searchRef} className="relative">
          <button
            type="button"
            aria-label="Search Task"
            data-testid="sidebar-search"
            onClick={() => setSearchOpen((o) => !o)}
            className={`flex h-10 w-full items-center gap-2 rounded-lg text-[14px] font-medium text-[#3F3F46] hover:bg-control-hover ${
              searchOpen ? "bg-control-hover" : ""
            } ${collapsed ? "justify-center" : "px-2.5"}`}
          >
            <Search size={20} className="shrink-0 text-text-muted" />
            {!collapsed && <span className="truncate">Search Task</span>}
          </button>
          {searchOpen && (
            <div
              data-testid="sidebar-search-panel"
              className="absolute left-full top-0 z-20 ml-2 w-64 rounded-panel border border-card-border bg-card-bg p-1 shadow-card-hover"
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workflows..."
                data-testid="sidebar-search-input"
                className="w-full rounded-md bg-canvas-bg px-2 py-1.5 text-sm text-text-strong placeholder:text-label-muted focus:outline-none"
              />
              <div className="mt-1 max-h-60 overflow-y-auto">
                {filtered.length === 0 && <p className="px-2 py-2 text-xs text-label-muted">No workflows found.</p>}
                {filtered.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    data-testid="sidebar-search-result"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      router.push(`/workflow/${w.id}`);
                    }}
                    className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-control-hover"
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <PlaceholderRow icon={MessageSquare} label="Task" testId="sidebar-task" collapsed={collapsed} />
        <PlaceholderRow icon={FolderOpen} label="Projects" testId="sidebar-projects" collapsed={collapsed} />
        <PlaceholderRow icon={Library} label="Library" testId="sidebar-library" collapsed={collapsed} />

        <button
          type="button"
          aria-label="Flow"
          data-testid="sidebar-workflows"
          onClick={() => router.push("/dashboard")}
          className={`flex h-10 w-full items-center gap-2 rounded-lg text-[14px] font-medium text-[#3F3F46] hover:bg-control-hover ${
            collapsed ? "justify-center" : "px-2.5"
          }`}
        >
          <Split size={20} className="shrink-0 text-text-muted" />
          {!collapsed && <span className="truncate">Flow</span>}
        </button>

        <PlaceholderRow icon={Boxes} label="Tools" testId="sidebar-tools" collapsed={collapsed} />
        <PlaceholderRow icon={BookOpen} label="API / MCP" testId="sidebar-api-mcp" collapsed={collapsed} />
      </nav>

      <div className={`min-w-0 overflow-hidden border-t border-divider py-3 ${collapsed ? "px-2" : "px-4"}`}>
        {collapsed ? (
          <button
            type="button"
            aria-label="Settings"
            data-testid="sidebar-settings"
            className="flex h-10 w-full items-center justify-center rounded-lg text-text-muted hover:bg-control-hover"
          >
            <Settings size={20} />
          </button>
        ) : (
          <UserButton
            showName
            appearance={{ elements: { userButtonBox: "max-w-full", userButtonOuterIdentifier: "truncate text-sm" } }}
          />
        )}
      </div>
    </aside>
  );
}
