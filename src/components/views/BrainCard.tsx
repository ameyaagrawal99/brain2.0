import { BrainRow } from '@/types/sheet'
import { useBrainStore } from '@/store/useBrainStore'
import { parseTags, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, CheckSquare, ExternalLink } from 'lucide-react'

interface BrainCardProps {
  row:             BrainRow
  dragHandleProps?: Record<string, unknown>
  isDragging?:     boolean
}

const CAT_STYLES: Record<string, string> = {
  Journal:     'bg-violet-50 text-violet-700',
  Work:        'bg-blue-50 text-blue-700',
  Learning:    'bg-green-50 text-green-700',
  Health:      'bg-rose-50 text-rose-700',
  Finance:     'bg-amber-50 text-amber-700',
  Ideas:       'bg-orange-50 text-orange-700',
  Personal:    'bg-pink-50 text-pink-700',
}

function getCatStyle(cat: string): string {
  return CAT_STYLES[cat] ?? 'bg-brand/8 text-brand'
}

function getStatusStyle(status: string): { dot: string; text: string } {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('complete')) return { dot: 'bg-green-500', text: 'text-green-600' }
  if (s.includes('progress')) return { dot: 'bg-blue-500', text: 'text-blue-600' }
  if (s.includes('pending')) return { dot: 'bg-amber-400', text: 'text-amber-600' }
  if (s.includes('block')) return { dot: 'bg-red-500', text: 'text-red-600' }
  return { dot: 'bg-ink3', text: 'text-ink3' }
}

export function BrainCard({ row, dragHandleProps, isDragging }: BrainCardProps) {
  const openModal = useBrainStore((s) => s.openModal)
  const tags      = parseTags(row.tags).slice(0, 2)
  const extraTags = parseTags(row.tags).length - tags.length
  const preview   = (row.rewritten || row.original || '').slice(0, 200)
  const firstAction = row.actionItems?.split('\n').filter(Boolean)[0]?.replace(/^\d+\.\s*/, '').trim()
  const firstLink   = row.links?.split('\n')[0]?.trim()
  const statusSt    = row.taskStatus ? getStatusStyle(row.taskStatus) : null

  return (
    <div
      className={cn(
        'brain-card group relative bg-surface border border-border rounded-xl p-4 cursor-pointer',
        'flex flex-col gap-2.5',
        isDragging && 'is-dragging',
      )}
      onClick={() => openModal(row)}
    >
      {dragHandleProps && (
        <div
          {...(dragHandleProps as object)}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1 top-4 opacity-0 group-hover:opacity-40 cursor-grab"
          data-drag-handle
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="text-ink3">
            <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
            <circle cx="2" cy="7" r="1.5"/><circle cx="8" cy="7" r="1.5"/>
            <circle cx="2" cy="12" r="1.5"/><circle cx="8" cy="12" r="1.5"/>
          </svg>
        </div>
      )}

      {/* Category + status row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {row.category && (
            <span className={cn('shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium', getCatStyle(row.category))}>
              {row.category}
            </span>
          )}
          {row.subCategory && (
            <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface2 text-ink2 max-w-[80px] truncate">
              {row.subCategory}
            </span>
          )}
        </div>
        {statusSt && row.taskStatus && (
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn('w-1.5 h-1.5 rounded-full', statusSt.dot)} />
            <span className={cn('text-[11px] font-medium whitespace-nowrap', statusSt.text)}>
              {row.taskStatus}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-semibold text-ink leading-snug line-clamp-2">
        {row.title || 'Untitled'}
      </h3>

      {/* Preview */}
      {preview && (
        <p className="text-[12px] text-ink2 leading-relaxed line-clamp-3">
          {preview}
        </p>
      )}

      {/* First action item */}
      {firstAction && (
        <div className="flex items-start gap-1.5 bg-surface2 rounded-lg px-2.5 py-1.5">
          <CheckSquare className="w-3 h-3 text-brand shrink-0 mt-0.5" />
          <span className="text-[11px] text-ink2 line-clamp-1">{firstAction}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {tags.map((t) => (
            <span key={t} className="tag-chip shrink-0">#{t}</span>
          ))}
          {extraTags > 0 && <span className="text-[10px] text-ink3 shrink-0">+{extraTags}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {firstLink && (
            <a href={firstLink} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()}
               className="text-ink3 hover:text-brand transition-colors">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {(row.dueDate || row.createdAt) && (
            <div className="flex items-center gap-1 text-ink3">
              <Calendar className="w-2.5 h-2.5" />
              <span className="text-[10px] whitespace-nowrap">{formatDate(row.dueDate || row.createdAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
