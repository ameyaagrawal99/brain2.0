import { cn } from '@/lib/utils'
import { statusColor } from '@/lib/utils'

export function StatusDot({ status }: { status: string }) {
  const color = statusColor(status)
  const dotColors: Record<string, string> = {
    ok:     'bg-ok',
    info:   'bg-info',
    danger: 'bg-danger',
    warn:   'bg-warn',
    ink3:   'bg-ink3',
  }
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', dotColors[color] ?? 'bg-ink3')} />
  )
}
