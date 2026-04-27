import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Workflow Builder — NextFlow',
  description: 'Build and execute LLM workflows with a visual drag-and-drop canvas',
}

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
