import { cn } from '@/lib/utils'

type BadgeVariant = 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'purple' | 'accent' | 'ink3' | 'surface'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

const variantMap: Record<BadgeVariant, string> = {
  brand:   'bg-brand/10 text-brand border-brand/20',
  ok:      'bg-ok/10 text-ok border-ok/20',
  warn:    'bg-warn/10 text-warn border-warn/20',
  danger:  'bg-danger/10 text-danger border-danger/20',
  info:    'bg-info/10 text-info border-info/20',
  purple:  'bg-purple/10 text-purple border-purple/20',
  accent:  'bg-accent/10 text-accent border-accent/20',
  ink3:    'bg-surface2 text-ink3 border-border',
  surface: 'bg-surface text-ink2 border-border',
}

export function Badge({ variant = 'ink3', className, children, onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        variantMap[variant],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      {children}
    </span>
  )
}
