import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?:    'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variants = {
      primary:   'bg-brand text-white hover:bg-brand-l shadow-sm',
      secondary: 'bg-surface2 text-ink hover:bg-hover border border-border',
      ghost:     'text-ink2 hover:bg-hover hover:text-ink',
      danger:    'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20',
      outline:   'border border-border2 text-ink hover:bg-hover',
    }

    const sizes = {
      sm:   'h-7  px-3  text-xs',
      md:   'h-9  px-4  text-sm',
      lg:   'h-11 px-6  text-sm',
      icon: 'h-9  w-9   text-sm',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
