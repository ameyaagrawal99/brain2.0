import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?:    'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'ghost',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-brand text-white hover:opacity-90 shadow-sm',
    ghost:   'text-ink2 hover:bg-hover hover:text-ink',
    outline: 'border border-border text-ink2 hover:bg-hover hover:text-ink',
    danger:  'text-danger hover:bg-danger/8',
  }

  const sizes = {
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-9 px-3.5 text-sm',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : children}
    </button>
  )
}
