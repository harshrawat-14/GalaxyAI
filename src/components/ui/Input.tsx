import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, label, error, ...props }, ref) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-[10px] text-textmuted uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
            'text-xs text-text placeholder:text-textsub',
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
