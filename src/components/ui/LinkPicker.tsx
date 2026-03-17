/**
 * LinkPicker — reusable popover for searching entries, selecting multiple,
 * assigning relationship types, and optionally expanding BFS chains.
 *
 * Props:
 *   onConfirm(links) — called with array of { title, type } to append
 *   onClose          — called when the picker should be dismissed
 *   currentLinks     — raw links string from the current row (to skip already-linked)
 *   excludeRowIndex  — _rowIndex of the host entry (never show it in results)
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Link2, ChevronDown, X, Check, Network } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { expandChain, formatLink, linkTypeLabel } from '@/lib/linkGraph'
import { extractWikiLinks } from '@/lib/linkGraph'
import type { LinkType } from '@/types/sheet'
import type { BrainRow } from '@/types/sheet'
import { cn } from '@/lib/utils'

export const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: 'untyped',     label: 'No type' },
  { value: 'references',  label: 'References' },
  { value: 'related',     label: 'Related to' },
  { value: 'supports',    label: 'Supports' },
  { value: 'contradicts', label: 'Contradicts' },
  { value: 'partOf',      label: 'Is part of' },
]

export const LINK_TYPE_COLORS: Record<LinkType, string> = {
  untyped:     'bg-surface2 text-ink3 border-border',
  references:  'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  related:     'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
  supports:    'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  contradicts: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  partOf:      'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
}

interface PickedLink {
  row: BrainRow
  type: LinkType
}

interface ChainPreviewEntry {
  row: BrainRow
  type: LinkType
  checked: boolean
}

interface LinkPickerProps {
  onConfirm: (links: { title: string; type: LinkType }[]) => void
  onClose: () => void
  currentLinks?: string
  excludeRowIndex?: number
}

export function LinkPicker({ onConfirm, onClose, currentLinks = '', excludeRowIndex }: LinkPickerProps) {
  const allRows = useBrainStore((s) => s.rows)

  const [query, setQuery]   = useState('')
  const [picked, setPicked] = useState<PickedLink[]>([])
  const [chainPreview, setChainPreview] = useState<ChainPreviewEntry[] | null>(null)
  const [chainSource, setChainSource]   = useState<BrainRow | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const existingTitles = useMemo(() => {
    return new Set(
      extractWikiLinks(currentLinks).map((t) => t.toLowerCase().trim())
    )
  }, [currentLinks])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows
      .filter((r) => {
        if (excludeRowIndex !== undefined && r._rowIndex === excludeRowIndex) return false
        if (!q) return true
        const haystack = [r.title, r.tags, r.original, r.rewritten]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 30)
  }, [allRows, query, excludeRowIndex])

  const pickedIndices = useMemo(() => new Set(picked.map((p) => p.row._rowIndex)), [picked])

  function toggleRow(row: BrainRow) {
    if (pickedIndices.has(row._rowIndex)) {
      setPicked((prev) => prev.filter((p) => p.row._rowIndex !== row._rowIndex))
      if (chainSource?._rowIndex === row._rowIndex) {
        setChainPreview(null)
        setChainSource(null)
      }
    } else {
      setPicked((prev) => [...prev, { row, type: 'untyped' }])
    }
  }

  function setType(rowIndex: number, type: LinkType) {
    setPicked((prev) => prev.map((p) => p.row._rowIndex === rowIndex ? { ...p, type } : p))
  }

  function handleShowChain(row: BrainRow) {
    const chain = expandChain([row], allRows, 3).slice(0, 20)
    if (!chain.length) return
    setChainSource(row)
    setChainPreview(chain.map((r) => ({ row: r, type: 'untyped' as LinkType, checked: true })))
  }

  function toggleChainEntry(rowIndex: number) {
    setChainPreview((prev) =>
      prev ? prev.map((e) => e.row._rowIndex === rowIndex ? { ...e, checked: !e.checked } : e) : prev
    )
  }

  function handleConfirm() {
    const links: { title: string; type: LinkType }[] = picked.map((p) => ({
      title: p.row.title,
      type: p.type,
    }))
    if (chainPreview) {
      for (const entry of chainPreview) {
        if (entry.checked && !links.some((l) => l.title === entry.row.title)) {
          links.push({ title: entry.row.title, type: entry.type })
        }
      }
    }
    if (links.length > 0) onConfirm(links)
    onClose()
  }

  const chainCheckedCount = chainPreview ? chainPreview.filter((e) => e.checked).length : 0

  return (
    <div className="flex flex-col gap-0 w-full max-h-[70vh]">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 px-2.5 py-2 bg-surface2 border border-border rounded-lg">
          <Search className="w-3.5 h-3.5 text-ink3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, tags, or content…"
            className="flex-1 text-sm bg-transparent text-ink placeholder:text-ink3 focus:outline-none min-w-0"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink3 hover:text-ink">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Results list */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: '240px' }}>
        {results.length === 0 ? (
          <p className="text-xs text-ink3 italic p-4 text-center">No matching entries found</p>
        ) : (
          <div className="divide-y divide-border/40">
            {results.map((row) => {
              const isPicked = pickedIndices.has(row._rowIndex)
              const isExisting = existingTitles.has(row.title?.toLowerCase().trim())
              const chainLinks = extractWikiLinks(row.links || '')
              const hasChain = chainLinks.length > 0

              return (
                <div
                  key={row._rowIndex}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 transition-colors',
                    isPicked ? 'bg-brand/5' : 'hover:bg-hover',
                    isExisting && 'opacity-50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !isExisting && toggleRow(row)}
                    disabled={isExisting}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isPicked ? 'bg-brand border-brand' : 'border-border2 hover:border-brand/60',
                      isExisting && 'cursor-not-allowed',
                    )}
                  >
                    {isPicked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => !isExisting && toggleRow(row)}
                    disabled={isExisting}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className={cn('text-sm font-medium truncate block', isPicked ? 'text-brand' : 'text-ink')}>
                      {row.title}
                    </span>
                    {row.category && (
                      <span className="text-[10px] text-ink3">{row.category}</span>
                    )}
                  </button>

                  {isExisting && (
                    <span className="text-[10px] text-ink3 shrink-0">linked</span>
                  )}

                  {/* Chain expand button */}
                  {hasChain && !isExisting && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleShowChain(row) }}
                      title={`Link chain (${chainLinks.length} connected)`}
                      className="shrink-0 flex items-center gap-0.5 text-[10px] text-ink3 hover:text-brand transition-colors px-1.5 py-0.5 rounded hover:bg-brand/5"
                    >
                      <Network className="w-2.5 h-2.5" />
                      +{chainLinks.length}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Picked entries — type assignment */}
      {picked.length > 0 && (
        <div className="border-t border-border p-3 space-y-2">
          <p className="text-[10px] text-ink3 font-semibold uppercase tracking-wider">Selected ({picked.length})</p>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {picked.map((p) => (
              <div key={p.row._rowIndex} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleRow(p.row)}
                  className="text-ink3 hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
                <span className="text-xs text-ink font-medium flex-1 min-w-0 truncate">{p.row.title}</span>
                <TypeDropdown value={p.type} onChange={(t) => setType(p.row._rowIndex, t)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chain preview */}
      {chainPreview && chainSource && (
        <div className="border-t border-border p-3 space-y-2 bg-surface2/40">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-ink3 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Network className="w-3 h-3" />
              Chain from "{chainSource.title}" ({chainPreview.length} entries)
            </p>
            <button
              type="button"
              onClick={() => { setChainPreview(null); setChainSource(null) }}
              className="text-ink3 hover:text-ink"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 max-h-[100px] overflow-y-auto">
            {chainPreview.map((entry) => (
              <label
                key={entry.row._rowIndex}
                className="flex items-center gap-2 cursor-pointer hover:bg-hover rounded px-1 py-0.5"
              >
                <input
                  type="checkbox"
                  checked={entry.checked}
                  onChange={() => toggleChainEntry(entry.row._rowIndex)}
                  className="accent-brand w-3 h-3 shrink-0"
                />
                <span className="text-xs text-ink truncate">{entry.row.title}</span>
                {entry.row.category && (
                  <span className="text-[10px] text-ink3 shrink-0">{entry.row.category}</span>
                )}
              </label>
            ))}
          </div>
          {chainCheckedCount > 0 && (
            <p className="text-[10px] text-ink3">{chainCheckedCount} chain entr{chainCheckedCount === 1 ? 'y' : 'ies'} will be added on confirm</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-3 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ink3 hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={picked.length === 0 && chainCheckedCount === 0}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5',
            picked.length > 0 || chainCheckedCount > 0
              ? 'bg-brand text-white hover:bg-brand/90'
              : 'bg-surface2 text-ink3 cursor-not-allowed',
          )}
        >
          <Link2 className="w-3 h-3" />
          Add {picked.length + chainCheckedCount} link{(picked.length + chainCheckedCount) !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

function TypeDropdown({ value, onChange }: { value: LinkType; onChange: (t: LinkType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = LINK_TYPES.find((t) => t.value === value) ?? LINK_TYPES[0]

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors',
          LINK_TYPE_COLORS[value],
        )}
      >
        {value === 'untyped' ? 'type' : linkTypeLabel(value)}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-xl shadow-xl w-36 overflow-hidden">
          {LINK_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { onChange(t.value); setOpen(false) }}
              className={cn(
                'w-full text-left text-xs px-3 py-1.5 transition-colors',
                t.value === value ? 'bg-brand/5 text-brand font-medium' : 'text-ink hover:bg-hover',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * LinkTypeBadge — small coloured badge for displaying a relationship type.
 */
export function LinkTypeBadge({ type }: { type: LinkType }) {
  if (type === 'untyped') return null
  return (
    <span className={cn(
      'inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide leading-none',
      LINK_TYPE_COLORS[type],
    )}>
      {linkTypeLabel(type)}
    </span>
  )
}

