'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Plus,
  Zap,
  Clock,
  Trash2,
  ArrowRight,
  Image as ImageIcon,
  Video,
  Package,
  Home,
  Workflow,
  Type,
  Brain,
  Crop,
  Film,
  PanelLeft,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast, Toaster } from 'sonner'
import { cn } from '@/lib/utils'

type WorkflowSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

const TEMPLATES = [
  {
    key: 'image-analyzer',
    name: 'Image Analyzer',
    description: 'Upload an image and ask Gemini to analyze it.',
    icon: ImageIcon,
    color: '#f59e0b',
  },
  {
    key: 'video-frame',
    name: 'Video Frame Extractor',
    description: 'Extract a frame from video and describe the scene.',
    icon: Video,
    color: '#06b6d4',
  },
  {
    key: 'product-kit',
    name: 'Product Marketing Kit',
    description: 'Multi-branch pipeline: photo + video → AI ad copy.',
    icon: Package,
    color: '#8b5cf6',
  },
] as const

const NODES = [
  { label: 'Image', icon: ImageIcon, color: '#f59e0b', starter: 'image' },
  { label: 'Video', icon: Video, color: '#ef4444', starter: 'video' },
  { label: 'Text', icon: Type, color: '#6366f1', starter: 'text' },
  { label: 'Run LLM', icon: Brain, color: '#8b5cf6', starter: 'llm' },
  { label: 'Crop', icon: Crop, color: '#22c55e', starter: 'crop' },
  { label: 'Extract Frame', icon: Film, color: '#06b6d4', starter: 'extract-frame' },
] as const

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    fetch('/api/workflow')
      .then((r) => r.json())
      .then((data) => {
        setWorkflows(data as WorkflowSummary[])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  async function deleteWorkflow(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/workflow/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setWorkflows((prev) => prev.filter((w) => w.id !== id))
        toast.success('Workflow deleted')
      } else {
        toast.error('Failed to delete workflow')
      }
    } catch {
      toast.error('Failed to delete workflow')
    }
    setDeleting(null)
  }

  const displayName = isLoaded
    ? user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split('@')[0] ?? ''
    : ''
  const userEmail = isLoaded ? user?.emailAddresses[0]?.emailAddress ?? '' : ''
  const userImage = isLoaded ? user?.imageUrl ?? '' : ''

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* ── Left sidebar (Krea-style) ── */}
      {sidebarOpen && (
        <aside className="w-[230px] flex flex-col bg-sidebar border-r border-border flex-shrink-0 sticky top-0 h-screen animate-slide-in-left">
          {/* Header: logo on left, toggle on right */}
          <div className="px-4 pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <Zap size={13} className="text-white fill-white" />
              </div>
              <span className="text-sm font-semibold text-text tracking-tight">NextFlow</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md text-textmuted hover:text-text hover:bg-surface transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeft size={15} />
            </button>
          </div>

          {/* Primary nav */}
          <nav className="px-2 space-y-0.5">
            <SidebarItem icon={Home} label="Home" active />
            <SidebarItem
              icon={Workflow}
              label="Node Editor"
              onClick={() => router.push('/workflow')}
            />
          </nav>

          {/* Nodes section */}
          <div className="px-4 pt-6 pb-2">
            <p className="text-[10px] font-semibold text-textmuted uppercase tracking-widest">
              Tools
            </p>
          </div>
          <div className="px-2 flex-1 overflow-y-auto space-y-0.5">
            {NODES.map((node) => (
              <button
                key={node.label}
                onClick={() => router.push(`/workflow?starter=${node.starter}`)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                hover:bg-surface transition-colors text-left cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: `${node.color}18`, border: `1px solid ${node.color}30` }}
                >
                  <node.icon size={12} style={{ color: node.color }} />
                </div>
                <span className="text-[13px] text-text/90">{node.label}</span>
              </button>
            ))}
          </div>

          {/* Footer: profile (custom Krea-style dropdown) */}
          <div className="p-2.5 border-t border-border">
            <UserMenu
              displayName={displayName}
              email={userEmail}
              imageUrl={userImage}
            />
          </div>
        </aside>
      )}

      {/* Floating toggle when sidebar is collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-20 p-2 rounded-lg bg-surface border border-border
            text-textmuted hover:text-text hover:bg-panel transition-colors animate-fade-in"
          aria-label="Open sidebar"
        >
          <PanelLeft size={15} />
        </button>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-8 py-6 space-y-8">

          {/* Hero banner — Krea's big featured panel */}
          <section className="relative rounded-3xl overflow-hidden border border-border">
            <div
              className="relative h-[320px] flex items-center justify-center"
              style={{
                background: `
                  radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.06) 0%, transparent 60%),
                  radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.18) 0%, transparent 65%),
                  linear-gradient(135deg, #1c1c1c 0%, #0f0f0f 100%)
                `,
              }}
            >
              {/* Subtle dot pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />

              <div className="relative text-center px-6 max-w-2xl">
                <h1 className="text-4xl sm:text-5xl font-semibold text-text/95 tracking-tight leading-tight mb-5">
                  Start by building a workflow
                </h1>
                <button
                  onClick={() => router.push('/workflow')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accenthov
                    text-white text-sm font-medium transition-all duration-150
                    shadow-[0_4px_20px_rgba(139,92,246,0.45)]"
                >
                  New Workflow
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>

          {/* Tool cards row — Krea's "Generate Image / Generate Video / ..." pattern */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Empty workflow */}
              <button
                onClick={() => router.push('/workflow')}
                className="group rounded-2xl border border-dashed border-border hover:border-borderhov
                  bg-surface/40 hover:bg-surface transition-all duration-150 overflow-hidden text-left"
              >
                <div className="aspect-video flex items-center justify-center bg-canvas/40">
                  <div className="w-11 h-11 rounded-2xl border border-border bg-surface flex items-center justify-center
                    group-hover:border-borderhov transition-colors">
                    <Plus size={18} className="text-textmuted" />
                  </div>
                </div>
                <div className="px-3 py-3">
                  <p className="text-sm font-medium text-text">Empty Workflow</p>
                  <p className="text-[11px] text-textsub mt-0.5">Start from scratch</p>
                </div>
              </button>

              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => router.push(`/workflow?sample=${t.key}`)}
                  className="group rounded-2xl border border-border hover:border-borderhov
                    bg-surface hover:bg-panel transition-all duration-150 overflow-hidden text-left"
                >
                  <div
                    className="aspect-video flex items-center justify-center relative"
                    style={{
                      background: `radial-gradient(ellipse at center, ${t.color}30 0%, transparent 65%), ${t.color}0a`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                      style={{ background: `${t.color}25`, border: `1px solid ${t.color}40` }}
                    >
                      <t.icon size={22} style={{ color: t.color }} />
                    </div>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-sm font-medium text-text">{t.name}</p>
                    <p className="text-[11px] text-textsub mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* My Workflows */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text">My Workflows</h2>
              <button
                onClick={() => router.push('/workflow')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-borderhov
                  border border-border text-xs text-text transition-colors"
              >
                <Plus size={12} />
                New
              </button>
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl border border-border bg-surface animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && workflows.length === 0 && (
              <div className="text-center py-14 border border-dashed border-border rounded-2xl">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl border border-border bg-surface flex items-center justify-center">
                  <Zap size={16} className="text-textsub" />
                </div>
                <p className="text-sm text-textsub">No workflows yet.</p>
                <button
                  onClick={() => router.push('/workflow')}
                  className="mt-3 text-xs text-accent hover:underline"
                >
                  Create your first workflow →
                </button>
              </div>
            )}

            {!isLoading && workflows.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="group relative rounded-2xl border border-border bg-surface
                      hover:border-borderhov hover:bg-panel transition-all duration-150 p-4 cursor-pointer"
                    onClick={() => router.push(`/workflow?id=${wf.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text truncate">{wf.name}</p>
                        <p className="text-[11px] text-textsub mt-1 flex items-center gap-1">
                          <Clock size={10} className="flex-shrink-0" />
                          {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void deleteWorkflow(wf.id)
                        }}
                        disabled={deleting === wf.id}
                        title="Delete workflow"
                        className="p-1.5 rounded-lg text-textsub hover:text-error hover:bg-error/10
                          opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40 flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5">
                      <ArrowRight size={11} className="text-accent flex-shrink-0" />
                      <span className="text-[10px] text-textsub">Open in editor</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#161616',
            border: '1px solid #222222',
            color: '#e5e5e5',
          },
        }}
      />
    </div>
  )
}

interface SidebarItemProps {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}

function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left',
        active
          ? 'bg-surface text-text'
          : 'text-textmuted hover:bg-surface hover:text-text',
      )}
    >
      <Icon size={15} />
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  )
}

interface UserMenuProps {
  displayName: string
  email: string
  imageUrl: string
}

function UserMenu({ displayName, email, imageUrl }: UserMenuProps) {
  const { signOut, openUserProfile } = useClerk()

  const initials = (displayName || email || 'U')
    .split(/[\s@]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const Avatar = ({ size }: { size: number }) =>
    imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="rounded-lg object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <span className="text-[11px] font-semibold text-accent">{initials}</span>
      </div>
    )

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl
            bg-surface/50 border border-border hover:border-borderhov hover:bg-surface
            transition-all duration-200 text-left cursor-pointer group"
        >
          <Avatar size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text truncate group-hover:text-white transition-colors">
              {displayName || 'User'}
            </p>
            <p className="text-[10px] text-textmuted truncate group-hover:text-textsub transition-colors">
              {email}
            </p>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={10}
          className="z-50 w-[280px] rounded-2xl border border-border bg-elevated p-1.5
            shadow-[0_12px_40px_rgba(0,0,0,0.7)] animate-fade-in backdrop-blur-xl"
        >
          {/* User header */}
          <div className="px-3 py-3 flex items-center gap-3">
            <div className="relative">
              <Avatar size={40} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-elevated" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text truncate">{displayName || 'User'}</p>
              <p className="text-[11px] text-textmuted truncate">{email}</p>
            </div>
          </div>

          <DropdownMenu.Separator className="mx-1.5 my-1.5 h-px bg-border" />

          {/* Workspace info */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0">
                <Sparkles size={12} className="text-textmuted" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-text">Personal Workspace</p>
                <p className="text-[10px] text-textmuted truncate">{email}</p>
              </div>
            </div>
          </div>

          <DropdownMenu.Separator className="mx-1.5 my-1.5 h-px bg-border" />

          <div className="space-y-0.5">
            <DropdownMenu.Item
              onSelect={() => openUserProfile()}
              className="flex items-center gap-3 px-3 py-2 text-xs text-textmuted rounded-lg
                cursor-pointer outline-none hover:bg-surface hover:text-text transition-all group"
            >
              <Settings size={14} className="group-hover:rotate-45 transition-transform duration-300" />
              <span>Manage account</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={() => void signOut()}
              className="flex items-center gap-3 px-3 py-2 text-xs text-textmuted rounded-lg
                cursor-pointer outline-none hover:bg-error/10 hover:text-error transition-all"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
