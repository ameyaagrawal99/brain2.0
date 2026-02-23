import { BrainRow } from '@/types/sheet'
import { useBrainStore } from '@/store/useBrainStore'
import { parseTags, formatDate, truncate, statusColor, categoryColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, GripVertical, ExternalLink } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'

interface BrainCardProps {
  row:          BrainRow
  dragHandleProps?: Record<string, unknown>
  isDragging?:  boolean
}

export function BrainCard({ row, dragHandleProps, isDragging }: BrainCardProps) {
  const openModal = useBrainStore((s) => s.openModal)
  const tags      = parseTags(row.tags)
  const catColor  = categoryColor(row.category) as string

  const catColorClass: Record<string, string> = {
    brand:  'text-brand bg-brand/8 border-brand/15',
    info:   'text-info bg-info/8 border-info/15',
    ok:     'text-ok bg-ok/8 border-ok/15',
    warn:   'text-warn bg-warn/8 border-warn/15',
    purple: 'text-purple bg-purple/8 border-purple/15',
    accent: 'text-accent bg-accent/8 border-accent/15',
    danger: 'text-danger bg-danger/8 border-danger/15',
  }

  return (
    <div
      className={cn(
        'brain-card group relative bg-surface border border-border rounded-lg p-4 cursor-pointer',
        'flex flex-col gap-3',
        isDragging && 'is-dragging shadow-xl',
      )}
      onClick={() => openModal(row)}
    >
      {/* Drag handle (hidden until hover) */}
      <div
        {...(dragHandleProps as object)}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-ink3 cursor-grab transition-opacity"
        data-drag-handle
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Header: category + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {row.category && (
            <span className={cn(
              'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
              catColorClass[catColor] ?? catColorClass.brand
            )}>
              {row.category}
            </span>
          )}
          {row.subCategory && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface2 text-ink2 border border-border">
              {row.subCategory}
            </span>
          )}
        </div>
        {row.taskStatus && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusDot status={row.taskStatus} />
            <span className="text-xs text-ink2 whitespace-nowrap">{row.taskStatus}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2">
        {row.title || 'Untitled'}
      </h3>

      {/* Body preview */}
      {(row.rewritten || row.original) && (
        <p className="text-xs text-ink2 leading-relaxed line-clamp-3 font-serif">
          {truncate(row.rewritten || row.original, 180)}
        </p>
      )}

      {/* Action items preview */}
      {row.actionItems && (
        <div className="text-xs text-ink2 bg-surface2 rounded-md px-3 py-2 line-clamp-2">
          {row.actionItems.split('\n')[0]}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 overflow-hidden">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="tag-chip text-[10px]">#{t}</span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-ink3">+{tags.length - 3}</span>
          )}
        </div>

        {/* Date + link */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {row.links && (
            <a
              href={row.links.split('\n')[0]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-ink3 hover:text-brand transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {row.dueDate && (
            <div className="flex items-center gap-1 text-ink3">
              <Calendar className="w-3 h-3" />
              <span className="text-[10px]">{formatDate(row.dueDate)}</span>
            </div>
          )}
          {!row.dueDate && row.createdAt && (
            <span className="text-[10px] text-ink3">{formatDate(row.createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
