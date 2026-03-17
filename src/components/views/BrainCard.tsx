import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import { parseTags, formatDate, formatRelative, dynamicCategoryColor, dynamicCategoryBorderColor, statusBgTint, getStatusDot, isImageUrl, highlight, parseActionItems } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckSquare, ExternalLink, Calendar, Check, Link2, Clock } from 'lucide-react'
import { stripMarkdown } from '@/lib/markdown'

function isFormula(v: string): boolean {
  if (!v) return false
  const s = v.trim()
  return s.startsWith('=AI(') || s.startsWith('=IF(') || s.startsWith('=IFERROR(') || s.startsWith('=ARRAYFORMULA(')
}

function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  'Done':        { label: 'Done',        cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  'In Progress': { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'Pending':     { label: 'Pending',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  'Blocked':     { label: 'Blocked',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  'In Review':   { label: 'In Review',   cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

interface BrainCardProps {
  row: BrainRow
  dragHandle?: React.ReactNode
}

export function BrainCard({ row, dragHandle }: BrainCardProps) {
  const openModal            = useBrainStore((s) => s.openModal)
  const searchQuery          = useBrainStore((s) => s.filters.search)
  const categoryColors       = useBrainStore((s) => s.categoryColors)
  const selectionMode        = useBrainStore((s) => s.selectionMode)
  const selectedCardIndices  = useBrainStore((s) => s.selectedCardIndices)
  const toggleCardSelection  = useBrainStore((s) => s.toggleCardSelection)
  const catClass             = dynamicCategoryColor(row.category, categoryColors)
  const catBorder            = dynamicCategoryBorderColor(row.category, categoryColors)
  const statusTint           = statusBgTint(row.taskStatus)
  const statusDot            = getStatusDot(row.taskStatus)
  const isSelected           = selectedCardIndices.includes(row._rowIndex)

  const rawText = row.rewritten || row.original || ''
  const preview = (() => {
    if (isFormula(rawText)) return ''
    return stripMarkdown(rawText).slice(0, 220)
  })()

  const actionItemsParsed = (() => {
    if (!row.actionItems || isFormula(row.actionItems)) return []
    return parseActionItems(row.actionItems)
  })()

  const firstAction = (() => {
    const pending = actionItemsParsed.find(i => !i.done)
    return (pending ?? actionItemsParsed[0])?.text ?? ''
  })()

  const taskProgress = actionItemsParsed.length > 0
    ? { done: actionItemsParsed.filter(i => i.done).length, total: actionItemsParsed.length }
    : null

  const tags    = parseTags(row.tags).slice(0, 2)
  const hasImage = row.mediaUrl && isImageUrl(row.mediaUrl)
  const hasSearch = !!searchQuery?.trim()

  const titleHtml   = hasSearch ? highlight(row.title || 'Untitled', searchQuery) : ''
  const previewHtml = hasSearch ? highlight(preview, searchQuery) : ''

  const statusInfo = row.taskStatus && !isFormula(row.taskStatus)
    ? STATUS_LABELS[row.taskStatus]
    : null

  const readTime = preview.trim().split(/\s+/).length > 30
    ? readingTimeMinutes(preview)
    : null

  function handleClick(e: React.MouseEvent) {
    if (selectionMode) {
      e.stopPropagation()
      toggleCardSelection(row._rowIndex)
    } else {
      openModal(row)
    }
  }

  return (
    <div
      className={cn(
        'brain-card group bg-surface border border-border border-l-[3px] rounded-xl overflow-hidden cursor-pointer relative',
        catBorder,
        statusTint,
        selectionMode && isSelected && 'ring-2 ring-brand border-brand/50',
        selectionMode && !isSelected && 'opacity-70',
      )}
      onClick={handleClick}
    >
      {/* Selection overlay */}
      {selectionMode && (
        <div
          className={cn(
            'absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm',
            isSelected
              ? 'bg-brand border-brand'
              : 'bg-surface border-border2 hover:border-brand/60',
          )}
          onClick={(e) => { e.stopPropagation(); toggleCardSelection(row._rowIndex) }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      )}

      {/* Drag handle */}
      {dragHandle && (
        <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-60 transition-opacity">
          {dragHandle}
        </div>
      )}

      {/* Cover image */}
      {hasImage && (
        <div className="w-full h-40 overflow-hidden bg-surface2">
          <img
            src={row.mediaUrl}
            alt={row.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      <div className={cn('p-4 flex flex-col gap-2.5', selectionMode && 'pl-9')}>

        {/* Top row: category badge + status pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {row.category && !isFormula(row.category) && (
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0', catClass)}>
                {row.category}
              </span>
            )}
            {row.subCategory && !isFormula(row.subCategory) && (
              <span className="text-[11px] text-ink3 truncate max-w-[90px]">· {row.subCategory}</span>
            )}
          </div>
          {statusInfo ? (
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap', statusInfo.cls)}>
              {statusInfo.label}
            </span>
          ) : row.taskStatus && !isFormula(row.taskStatus) ? (
            <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1', statusDot)} title={row.taskStatus} />
          ) : null}
        </div>

        {/* Title */}
        {hasSearch ? (
          <h3
            className="text-sm font-semibold text-ink leading-snug line-clamp-2 -mt-0.5"
            dangerouslySetInnerHTML={{ __html: titleHtml || 'Untitled' }}
          />
        ) : (
          <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2 -mt-0.5">
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

        {/* Action items */}
        {firstAction && (
          <div className="flex items-start gap-2 bg-surface2 rounded-lg px-2.5 py-2">
            <CheckSquare className="w-3 h-3 text-brand shrink-0 mt-0.5" />
            <span className="text-[11px] text-ink2 leading-snug line-clamp-2 flex-1">{firstAction}</span>
            {taskProgress && (
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                  taskProgress.done === taskProgress.total
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-surface text-ink3',
                )}>
                  {taskProgress.done}/{taskProgress.total}
                </span>
                {taskProgress.total > 1 && (
                  <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${(taskProgress.done / taskProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-wrap">
            {tags.map((t) => (
              <span key={t} className="text-[10px] text-ink3 bg-surface2 px-1.5 py-0.5 rounded-md shrink-0">
                #{t}
              </span>
            ))}
            {parseTags(row.tags).length > 2 && (
              <span className="text-[10px] text-ink3">+{parseTags(row.tags).length - 2}</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-ink3">
            {readTime && (
              <span className="flex items-center gap-0.5 text-[10px]">
                <Clock className="w-2.5 h-2.5" />{readTime}m
              </span>
            )}
            {row.links && !isFormula(row.links) && (() => {
              const lines     = row.links.split('\n').map(l => l.trim()).filter(Boolean)
              const entryRefs = lines.filter(l => /^\[\[.+\]\]$/.test(l)).length
              const httpLinks = lines.filter(l => l.startsWith('http')).length
              return (
                <>
                  {entryRefs > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px]" title={`${entryRefs} linked entr${entryRefs === 1 ? 'y' : 'ies'}`}>
                      <Link2 className="w-2.5 h-2.5" />{entryRefs}
                    </span>
                  )}
                  {httpLinks > 0 && (
                    <ExternalLink className="w-3 h-3" title={`${httpLinks} link${httpLinks === 1 ? '' : 's'}`} />
                  )}
                </>
              )
            })()}
            <span className="text-[10px]">
              {row.dueDate && !isFormula(row.dueDate)
                ? <span className="flex items-center gap-0.5 text-amber-500"><Calendar className="w-2.5 h-2.5" />{formatDate(row.dueDate)}</span>
                : row.createdAt ? formatRelative(row.createdAt) : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
