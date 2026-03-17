import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import { parseTags, formatDate, formatRelative, dynamicCategoryColor, dynamicCategoryBorderColor, statusBgTint, getStatusDot, isImageUrl, highlight, parseActionItems } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckSquare, ExternalLink, Calendar, Tag, Check, Link2 } from 'lucide-react'
import { stripMarkdown } from '@/lib/markdown'

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

  const preview = (() => {
    const raw = row.rewritten || row.original || ''
    if (isFormula(raw)) return ''
    return stripMarkdown(raw).slice(0, 200)
  })()

  const actionItemsParsed = (() => {
    if (!row.actionItems || isFormula(row.actionItems)) return []
    return parseActionItems(row.actionItems)
  })()

  const firstAction = (() => {
    // Show first incomplete task, or first task if all done
    const pending = actionItemsParsed.find(i => !i.done)
    return (pending ?? actionItemsParsed[0])?.text ?? ''
  })()

  const taskProgress = actionItemsParsed.length > 0
    ? { done: actionItemsParsed.filter(i => i.done).length, total: actionItemsParsed.length }
    : null

  const tags = parseTags(row.tags).slice(0, 2)
  const hasImage = row.mediaUrl && isImageUrl(row.mediaUrl)
  const hasSearch = !!searchQuery?.trim()

  const titleHtml   = hasSearch ? highlight(row.title || 'Untitled', searchQuery) : ''
  const previewHtml = hasSearch ? highlight(preview, searchQuery) : ''

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
        'brain-card bg-surface border border-border border-l-[3px] rounded-xl overflow-hidden cursor-pointer hover:border-brand/30 transition-all relative',
        catBorder,
        statusTint,
        selectionMode && isSelected && 'ring-2 ring-brand border-brand/50',
        selectionMode && !isSelected && 'opacity-80',
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox overlay */}
      {selectionMode && (
        <div
          className={cn(
            'absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-brand border-brand'
              : 'bg-surface border-border2 hover:border-brand/60',
          )}
          onClick={(e) => { e.stopPropagation(); toggleCardSelection(row._rowIndex) }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      )}

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

      <div className={cn('p-4 flex flex-col gap-2.5', selectionMode && 'pl-9')}>
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

        {/* Action items: first item + progress */}
        {firstAction && (
          <div className="flex items-center gap-1.5 bg-surface2 rounded-lg px-2.5 py-1.5">
            <CheckSquare className="w-3 h-3 text-brand shrink-0 mt-0.5 self-start" />
            <span className="text-[11px] text-ink2 leading-snug line-clamp-1 flex-1">{firstAction}</span>
            {taskProgress && taskProgress.total > 1 && (
              <span className={cn(
                'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none',
                taskProgress.done === taskProgress.total
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-surface text-ink3',
              )}>
                {taskProgress.done}/{taskProgress.total}
              </span>
            )}
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
            {row.links && !isFormula(row.links) && (() => {
              const lines = row.links.split('\n').map((l) => l.trim()).filter(Boolean)
              const entryRefs = lines.filter((l) => /^\[\[.+\]\]$/.test(l)).length
              const httpLinks = lines.filter((l) => l.startsWith('http')).length
              return (
                <>
                  {entryRefs > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-ink3" title={`${entryRefs} linked entr${entryRefs === 1 ? 'y' : 'ies'}`}>
                      <Link2 className="w-2.5 h-2.5" />{entryRefs}
                    </span>
                  )}
                  {httpLinks > 0 && <ExternalLink className="w-3 h-3 text-ink3" title={`${httpLinks} external link${httpLinks === 1 ? '' : 's'}`} />}
                </>
              )
            })()}
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
