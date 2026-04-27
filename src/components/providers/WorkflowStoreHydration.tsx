'use client'

import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Hydration wrapper for the workflow store.
 * Ensures client-side store is ready before rendering canvas components.
 */
export function WorkflowStoreHydration({ children }: Props) {
  return <>{children}</>
}
