import { useState, useRef, useEffect } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import {
  parseTags, formatRelative, parseActionItems,
  isImageUrl, highlight, cn,
} from '@/lib/utils'
import { CheckSquare2, ExternalLink, Calendar, Check, Link2, Clock, Sparkles } from 'lucide-react'
import { stripMarkdown } from '@/lib/markdown'
import { LinkPicker } from '@/components/ui/LinkPicker'
import { useSheetSync } from '@/hooks/useSheetSync'
import { formatLink, extractTypedLinks } from '@/lib/linkGraph'
import type { LinkType } from '@/types/sheet'
import toast from 'react-hot-toast'

function isFormula(v: string): boolean {
  if (!v) return false
  const s = v.trim()
  return s.startsWith('=AI(') || s.startsWith('=IF(') || s.startsWith('=IFERROR(') || s.startsWith('=ARRAYFORMULA(')
}

/* Category → top-bar color mapping */
const CAT_COLORS: Record<string, { bar: string; dot: string; label: string }> = {
  reflection:            { bar: 'bg-violet-500',  dot: 'bg-violet-400',  label: 'text-violet-600 dark:text-violet-400' },
  journal:               { bar: 'bg-violet-500',  dot: 'bg-violet-400',  label: 'text-violet-600 dark:text-violet-400' },
  'professional develo': { bar: 'bg-blue-500',    dot: 'bg-blue-400',    label: 'text-blue-600 dark:text-blue-400' },
  'professional d':      { bar: 'bg-blue-500',    dot: 'bg-blue-400',    label: 'text-blue-600 dark:text-blue-400' },
  work:                  { bar: 'bg-blue-500',    dot: 'bg-blue-400',    label: 'text-blue-600 dark:text-blue-400' },
  social:                { bar: 'bg-pink-500',    dot: 'bg-pink-400',    label: 'text-pink-600 dark:text-pink-400' },
  'social media':        { bar: 'bg-pink-500',    dot: 'bg-pink-400',    label: 'text-pink-600 dark:text-pink-400' },
  career:                { bar: 'bg-indigo-500',  dot: 'bg-indigo-400',  label: 'text-indigo-600 dark:text-indigo-400' },
  observation:           { bar: 'bg-teal-500',    dot: 'bg-teal-400',    label: 'text-teal-600 dark:text-teal-400' },
  education:             { bar: 'bg-emerald-500', dot: 'bg-emerald-400', label: 'text-emerald-600 dark:text-emerald-400' },
  learning:              { bar: 'bg-emerald-500', dot: 'bg-emerald-400', label: 'text-emerald-600 dark:text-emerald-400' },
  finance:               { bar: 'bg-amber-500',   dot: 'bg-amber-400',   label: 'text-amber-600 dark:text-amber-400' },
  health:                { bar: 'bg-rose-500',    dot: 'bg-rose-400',    label: 'text-rose-600 dark:text-rose-400' },
  ideas:                 { bar: 'bg-orange-500',  dot: 'bg-orange-400',  label: 'text-orange-600 dark:text-orange-400' },
  personal:              { bar: 'bg-fuchsia-500', dot: 'bg-fuchsia-400', label: 'text-fuchsia-600 dark:text-fuchsia-400' },
  meetings:              { bar: 'bg-cyan-500',    dot: 'bg-cyan-400',    label: 'text-cyan-600 dark:text-cyan-400' },
  media:                 { bar: 'bg-rose-400',    dot: 'bg-rose-300',    label: 'text-rose-600 dark:text-rose-400' },
  'business idea':       { bar: 'bg-green-500',   dot: 'bg-green-400',   label: 'text-green-600 dark:text-green-400' },
  productivity:          { bar: 'bg-sky-500',     dot: 'bg-sky-400',     label: 'text-sky-600 dark:text-sky-400' },
  agriculture:           { bar: 'bg-lime-600',    dot: 'bg-lime-400',    label: 'text-lime-700 dark:text-lime-400' },
  'self-reflection':     { bar: 'bg-violet-600',  dot: 'bg-violet-400',  label: 'text-violet-600 dark:text-violet-400' },
}

function getCatTheme(cat: string, categoryColors: Record<string, string>) {
  const key = cat?.toLowerCase()
  if (!key) return null

  const customColor = categoryColors[key]
  if (customColor) {
    const colorMap: Record<string, { bar: string; dot: string; label: string }> = {
      violet: { bar: 'bg-violet-500',  dot: 'bg-violet-400',  label: 'text-violet-600 dark:text-violet-400' },
      blue:   { bar: 'bg-blue-500',    dot: 'bg-blue-400',    label: 'text-blue-600 dark:text-blue-400' },
      green:  { bar: 'bg-green-500',   dot: 'bg-green-400',   label: 'text-green-600 dark:text-green-400' },
      rose:   { bar: 'bg-rose-500',    dot: 'bg-rose-400',    label: 'text-rose-600 dark:text-rose-400' },
      amber:  { bar: 'bg-amber-500',   dot: 'bg-amber-400',   label: 'text-amber-600 dark:text-amber-400' },
      orange: { bar: 'bg-orange-500',  dot: 'bg-orange-400',  label: 'text-orange-600 dark:text-orange-400' },
      pink:   { bar: 'bg-pink-500',    dot: 'bg-pink-400',    label: 'text-pink-600 dark:text-pink-400' },
      teal:   { bar: 'bg-teal-500',    dot: 'bg-teal-400',    label: 'text-teal-600 dark:text-teal-400' },
      cyan:   { bar: 'bg-cyan-500',    dot: 'bg-cyan-400',    label: 'text-cyan-600 dark:text-cyan-400' },
      indigo: { bar: 'bg-indigo-500',  dot: 'bg-indigo-400',  label: 'text-indigo-600 dark:text-indigo-400' },
      lime:   { bar: 'bg-lime-500',    dot: 'bg-lime-400',    label: 'text-lime-700 dark:text-lime-400' },
    }
    return colorMap[customColor] ?? null
  }

  return CAT_COLORS[key]
    ?? Object.entries(CAT_COLORS).find(([k]) => key.startsWith(k))?.[1]
    ?? null
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
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
  const openModal           = useBrainStore((s) => s.openModal)
  const searchQuery         = useBrainStore((s) => s.filters.search)
  const categoryColors      = useBrainStore((s) => s.categoryColors)
  const selectionMode       = useBrainStore((s) => s.selectionMode)
  const selectedCardIndices = useBrainStore((s) => s.selectedCardIndices)
  const toggleCardSelection = useBrainStore((s) => s.toggleCardSelection)
  const isSelected          = selectedCardIndices.includes(row._rowIndex)

  const { saveRow } = useSheetSync()

  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showLinkPicker) return
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowLinkPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showLinkPicker])

  const theme = getCatTheme(row.category, categoryColors)

  const rawText = row.rewritten || row.original || ''
  const preview = (() => {
    if (isFormula(rawText)) return ''
    return stripMarkdown(rawText).slice(0, 180)
  })()

  const actionItems = (() => {
    if (!row.actionItems || isFormula(row.actionItems)) return []
    return parseActionItems(row.actionItems)
  })()

  const taskProgress = actionItems.length > 0
    ? { done: actionItems.filter(i => i.done).length, total: actionItems.length }
    : null

  const tags     = parseTags(row.tags).slice(0, 3)
  const hasImage = row.mediaUrl && isImageUrl(row.mediaUrl)
  const hasSearch = !!searchQuery?.trim()

  const titleHtml   = hasSearch ? highlight(row.title || 'Untitled', searchQuery) : ''
  const previewHtml = hasSearch ? highlight(preview, searchQuery) : ''

  const statusInfo = row.taskStatus && !isFormula(row.taskStatus)
    ? STATUS_META[row.taskStatus]
    : null

  const isAIEnhanced = !!row.rewritten && !isFormula(row.rewritten)
  const isOverdue    = (() => {
    if (!row.dueDate || row.taskStatus === 'Done') return false
    return row.dueDate < new Date().toISOString().slice(0, 10)
  })()

  const linkCount = (() => {
    if (!row.links || isFormula(row.links)) return { refs: 0, http: 0 }
    const lines = row.links.split('\n').map(l => l.trim()).filter(Boolean)
    return {
      refs: lines.filter(l => /^\[\[.+\]\]$/.test(l)).length,
      http: lines.filter(l => l.startsWith('http')).length,
    }
  })()

  function handleClick(e: React.MouseEvent) {
    if (selectionMode) { e.stopPropagation(); toggleCardSelection(row._rowIndex) }
    else openModal(row)
  }

  async function handleLinkPickerConfirm(links: { title: string; type: LinkType }[]) {
    const currentLinks = (row.links ?? '').trim()
    const existing = new Set(extractTypedLinks(currentLinks).map((l) => l.title.toLowerCase()))
    const newRefs = links
      .filter((l) => !existing.has(l.title.toLowerCase()))
      .map((l) => formatLink(l.title, l.type))
    if (!newRefs.length) { toast('All selected entries already linked'); setShowLinkPicker(false); return }
    const updatedLinks = [currentLinks, ...newRefs].filter(Boolean).join('\n')
    setSaving(true)
    try {
      await saveRow(row._rowIndex, { links: updatedLinks }, 'Link')
      toast.success(`${newRefs.length} link${newRefs.length !== 1 ? 's' : ''} added`)
    } finally {
      setSaving(false)
      setShowLinkPicker(false)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'brain-card group relative bg-surface border border-border rounded-xl overflow-hidden cursor-pointer',
        'shadow-[var(--shadow-xs)]',
        isSelected && 'ring-2 ring-brand',
        selectionMode && !isSelected && 'opacity-60',
        isOverdue && 'border-red-200 dark:border-red-800',
      )}
    >
      {/* Category color bar — top */}
      {theme && (
        <div className={cn('h-[3px] w-full', theme.bar)} />
      )}

      {/* Selection checkbox */}
      {selectionMode && (
        <div
          onClick={(e) => { e.stopPropagation(); toggleCardSelection(row._rowIndex) }}
          className={cn(
            'absolute top-3 left-3 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm',
            isSelected ? 'bg-brand border-brand' : 'bg-surface border-border2 hover:border-brand/60',
          )}>
          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      )}

      {/* Drag handle */}
      {dragHandle && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-50 transition-opacity">
          {dragHandle}
        </div>
      )}

      {/* Cover image */}
      {hasImage && (
        <div className="w-full h-36 overflow-hidden bg-surface2">
          <img
            src={row.mediaUrl}
            alt={row.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
            onError={(e) => { const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.display = 'none' }}
          />
        </div>
      )}

      {/* Content */}
      <div className={cn('p-4 flex flex-col gap-2', selectionMode && 'pl-10')}>

        {/* Header row: category + status */}
        <div className="flex items-center justify-between gap-2 min-h-[18px]">
          <div className="flex items-center gap-1.5 min-w-0">
            {theme && (
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', theme.dot)} />
            )}
            {row.category && !isFormula(row.category) && (
              <span className={cn(
                'text-[11px] font-semibold truncate',
                theme ? theme.label : 'text-ink3'
              )}>
                {row.category}
                {row.subCategory && !isFormula(row.subCategory) && (
                  <span className="text-ink3 font-normal"> · {row.subCategory}</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAIEnhanced && (
              <span title="AI enhanced"><Sparkles className="w-3 h-3 text-brand/50" /></span>
            )}
            {statusInfo ? (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap leading-tight', statusInfo.cls)}>
                {statusInfo.label}
              </span>
            ) : row.taskStatus && !isFormula(row.taskStatus) ? (
              <span className={cn(
                'w-2 h-2 rounded-full',
                row.taskStatus.toLowerCase().includes('done') ? 'bg-green-500' :
                row.taskStatus.toLowerCase().includes('progress') ? 'bg-blue-500' :
                row.taskStatus.toLowerCase().includes('blocked') ? 'bg-red-500' :
                'bg-amber-400'
              )} title={row.taskStatus} />
            ) : null}
          </div>
        </div>

        {/* Title */}
        {hasSearch ? (
          <h3 className="text-[14px] font-semibold text-ink leading-snug line-clamp-2"
            dangerouslySetInnerHTML={{ __html: titleHtml || 'Untitled' }} />
        ) : (
          <h3 className="text-[14px] font-semibold text-ink leading-snug line-clamp-2">
            {row.title || 'Untitled'}
          </h3>
        )}

        {/* Preview */}
        {preview && (
          hasSearch ? (
            <p className="text-[12px] text-ink2 leading-relaxed line-clamp-3 font-normal"
              dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="text-[12px] text-ink2 leading-relaxed line-clamp-3 font-normal">{preview}</p>
          )
        )}

        {/* Task progress bar */}
        {taskProgress && taskProgress.total > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1 bg-surface2 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  taskProgress.done === taskProgress.total ? 'bg-green-500' : 'bg-brand'
                )}
                style={{ width: `${(taskProgress.done / taskProgress.total) * 100}%` }}
              />
            </div>
            <span className={cn(
              'text-[10px] font-semibold shrink-0',
              taskProgress.done === taskProgress.total ? 'text-green-600 dark:text-green-400' : 'text-ink3'
            )}>
              {taskProgress.done}/{taskProgress.total}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-border/50">

          {/* Tags */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {tags.map((t) => (
              <span key={t} className="text-[10px] text-ink3 bg-surface2 px-1.5 py-0.5 rounded-md shrink-0 max-w-[80px] truncate">
                #{t}
              </span>
            ))}
            {parseTags(row.tags).length > 3 && (
              <span className="text-[10px] text-ink3 shrink-0">+{parseTags(row.tags).length - 3}</span>
            )}
          </div>

          {/* Meta: links, due date, time + inline link button */}
          <div className="flex items-center gap-2 shrink-0 text-ink3">
            {linkCount.refs > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]" title={`${linkCount.refs} linked`}>
                <Link2 className="w-2.5 h-2.5" />{linkCount.refs}
              </span>
            )}
            {linkCount.http > 0 && (
              <span title={`${linkCount.http} link(s)`}><ExternalLink className="w-2.5 h-2.5" /></span>
            )}
            {row.dueDate && !isFormula(row.dueDate) ? (
              <span className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium',
                isOverdue ? 'text-red-500' : 'text-amber-500'
              )}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(row.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            ) : row.createdAt ? (
              <span className="text-[10px]">
                <Clock className="w-2.5 h-2.5 inline mr-0.5" />{formatRelative(row.createdAt)}
              </span>
            ) : null}

            {/* Inline link button */}
            {!selectionMode && (
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowLinkPicker((v) => !v)
                  }}
                  title="Link to another entry"
                  className={cn(
                    'opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-md hover:bg-hover',
                    saving && 'opacity-100 cursor-wait',
                  )}
                >
                  <Link2 className="w-3 h-3" />
                </button>

                {showLinkPicker && (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-50 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 border-b border-border bg-surface2/60 flex items-center gap-1.5">
                      <Link2 className="w-3 h-3 text-brand shrink-0" />
                      <span className="text-[11px] font-semibold text-ink2">Link to entry</span>
                    </div>
                    <LinkPicker
                      onConfirm={handleLinkPickerConfirm}
                      onClose={() => setShowLinkPicker(false)}
                      currentLinks={row.links ?? ''}
                      excludeRowIndex={row._rowIndex}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
