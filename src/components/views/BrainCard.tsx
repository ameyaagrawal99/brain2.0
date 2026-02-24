import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import { parseTags, formatDate, formatRelative, categoryColor, getStatusDot, isImageUrl, highlight } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckSquare, ExternalLink, Calendar, Tag } from 'lucide-react'

function isFormula(v: string): boolean {
  if (!v) return false
  const s = v.trim()
  return s.startsWith('=AI(') || s.startsWith('=IF(') || s.startsWith('=IFERROR(') || s.startsWith('=ARRAYFORMULA(')
}

interface BrainCardProps {
  row: BrainRow
  dragHandle?: React.ReactNode
}

export function BrainCard({ row, dragHandle }: BrainCardProps) {
  const openModal    = useBrainStore((s) => s.openModal)
  const searchQuery  = useBrainStore((s) => s.filters.search)
  const catClass     = categoryColor(row.category)
  const statusDot    = getStatusDot(row.taskStatus)

  const preview = (() => {
    const raw = row.rewritten || row.original || ''
    if (isFormula(raw)) return ''
    return raw.slice(0, 200)
  })()

  const firstAction = (() => {
    if (!row.actionItems || isFormula(row.actionItems)) return ''
    return row.actionItems
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim())
      .find((l) => l.length > 0) || ''
  })()

  const tags = parseTags(row.tags).slice(0, 2)
  const hasImage = row.mediaUrl && isImageUrl(row.mediaUrl)
  const hasSearch = !!searchQuery?.trim()

  const titleHtml   = hasSearch ? highlight(row.title || 'Untitled', searchQuery) : ''
  const previewHtml = hasSearch ? highlight(preview, searchQuery) : ''

  return (
    <div
      className="brain-card bg-surface border border-border rounded-xl overflow-hidden cursor-pointer hover:border-brand/30 transition-all"
      onClick={() => openModal(row)}
    >
      {/* Cover image */}
      {hasImage && (
        <div className="w-full h-36 overflow-hidden bg-surface2">
          <img
            src={row.mediaUrl}
            alt={row.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2.5">
        {/* Category + status row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {row.category && !isFormula(row.category) && (
              <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0', catClass)}>
                {row.category}
              </span>
            )}
            {row.subCategory && !isFormula(row.subCategory) && (
              <span className="text-[11px] text-ink3 truncate max-w-[100px]">{row.subCategory}</span>
            )}
          </div>
          {row.taskStatus && !isFormula(row.taskStatus) && (
            <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot)} title={row.taskStatus} />
          )}
          {dragHandle && <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">{dragHandle}</div>}
        </div>

        {/* Title */}
        {hasSearch ? (
          <h3
            className="text-sm font-semibold text-ink leading-snug line-clamp-2"
            dangerouslySetInnerHTML={{ __html: titleHtml || 'Untitled' }}
          />
        ) : (
          <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2">
            {row.title || 'Untitled'}
          </h3>
        )}

        {/* Preview */}
        {preview && (
          hasSearch ? (
            <p
              className="text-xs text-ink2 leading-relaxed line-clamp-3"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-xs text-ink2 leading-relaxed line-clamp-3">{preview}</p>
          )
        )}

        {/* First action item */}
        {firstAction && (
          <div className="flex items-start gap-1.5 bg-surface2 rounded-lg px-2.5 py-1.5">
            <CheckSquare className="w-3 h-3 text-brand shrink-0 mt-0.5" />
            <span className="text-[11px] text-ink2 leading-snug line-clamp-1">{firstAction}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Tags */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-0.5 text-[10px] text-ink3 shrink-0">
                <Tag className="w-2.5 h-2.5" />#{t}
              </span>
            ))}
            {parseTags(row.tags).length > 2 && (
              <span className="text-[10px] text-ink3">+{parseTags(row.tags).length - 2}</span>
            )}
          </div>

          {/* Date + link indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {row.links && !isFormula(row.links) && (
              <ExternalLink className="w-3 h-3 text-ink3" />
            )}
            <span className="text-[10px] text-ink3">
              {row.dueDate && !isFormula(row.dueDate)
                ? <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{formatDate(row.dueDate)}</span>
                : row.createdAt ? formatRelative(row.createdAt) : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
