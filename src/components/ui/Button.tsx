import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-accent/50',
          // Variants
          variant === 'primary' && 'bg-accent hover:bg-accenthov text-white',
          variant === 'secondary' &&
            'bg-surface hover:bg-borderhov text-text border border-border',
          variant === 'ghost' &&
            'bg-transparent hover:bg-surface text-textmuted hover:text-text',
          variant === 'danger' &&
            'bg-error/10 hover:bg-error/20 text-error border border-error/30',
          // Sizes
          size === 'sm' && 'px-2.5 py-1 text-xs',
          size === 'md' && 'px-3.5 py-2 text-sm',
          size === 'lg' && 'px-5 py-2.5 text-sm',
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </button>
    )
  },
)
