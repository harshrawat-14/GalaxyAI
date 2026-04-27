'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  nodeId: string
  nodeType: string
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string | null
}

export class NodeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-xl border border-error/40 bg-error/5 overflow-hidden"
          style={{ minWidth: 240 }}
        >
          <div className="h-0.5 w-full bg-error" />
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle size={13} />
              <span className="text-xs font-medium">Node crashed</span>
            </div>
            <p className="text-[10px] text-textmuted font-mono truncate">
              {this.state.error}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-1.5 text-[10px] text-textmuted hover:text-text
                transition-colors"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
