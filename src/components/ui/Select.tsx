import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, label, options, ...props }, ref) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-[10px] text-textmuted uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full bg-surface border border-border rounded-lg px-2.5 py-1.5',
              'text-xs text-text appearance-none cursor-pointer',
              'focus:outline-none focus:border-accent transition-colors',
              className,
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-textmuted pointer-events-none"
          />
        </div>
      </div>
    )
  },
)
