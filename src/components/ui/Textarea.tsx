import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, label, error, ...props }, ref) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-[10px] text-textmuted uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
            'text-xs text-text resize-none placeholder:text-textsub',
            'focus:outline-none focus:border-accent transition-colors',
            error && 'border-error focus:border-error',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[10px] text-error">{error}</p>}
      </div>
    )
  },
)
