'use client'

import { useEffect, useState } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Plus, Zap, Workflow, Clock, Trash2, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

type WorkflowSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

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
    ? user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? ''
    : ''

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top nav */}
      <header className="border-b border-border px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-text">NextFlow</span>
        </div>

        <div className="flex items-center gap-3">
          {displayName && (
            <span className="text-xs text-textmuted hidden sm:block">
              {displayName}
            </span>
          )}
          <UserButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text">
            {displayName ? `Welcome back, ${displayName.split(' ')[0]}` : 'My Workflows'}
          </h1>
          <p className="text-sm text-textmuted mt-1">
            Build and run LLM workflows visually.
          </p>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-textmuted uppercase tracking-wider">
            Workflows
          </h2>
          <button
            onClick={() => router.push('/workflow')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accenthov
              text-white text-xs font-medium transition-colors"
          >
            <Plus size={13} />
            New Workflow
          </button>
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-border bg-surface animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && workflows.length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <Workflow size={28} className="mx-auto text-textsub mb-3" />
            <p className="text-sm text-textsub">No workflows yet.</p>
            <button
              onClick={() => router.push('/workflow')}
              className="mt-4 text-xs text-accent hover:underline"
            >
              Create your first workflow →
            </button>
          </div>
        )}

        {/* Workflow grid */}
        {!isLoading && workflows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="group relative rounded-xl border border-border bg-surface
                  hover:border-borderhov transition-colors p-4 cursor-pointer"
                onClick={() => router.push(`/workflow?id=${wf.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text truncate">{wf.name}</p>
                    <p className="text-[11px] text-textsub mt-1 flex items-center gap-1">
                      <Clock size={10} className="flex-shrink-0" />
                      {formatDistanceToNow(new Date(wf.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteWorkflow(wf.id)
                    }}
                    disabled={deleting === wf.id}
                    title="Delete workflow"
                    className="p-1.5 rounded-md text-textsub hover:text-error hover:bg-error/10
                      opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40
                      flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <Play size={10} className="text-accent flex-shrink-0" />
                  <span className="text-[10px] text-textsub">Open in editor</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
