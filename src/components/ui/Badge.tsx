import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'error' | 'warning' | 'accent'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
        variant === 'default' && 'bg-surface text-textmuted',
        variant === 'success' && 'bg-success/10 text-success',
        variant === 'error' && 'bg-error/10 text-error',
        variant === 'warning' && 'bg-warning/10 text-warning',
        variant === 'accent' && 'bg-accent/10 text-accent',
        className,
      )}
    >
      {children}
    </span>
  )
}
